---
name: raise
description: Prepare and open the EquipQR release PR from preview to main. Use when the user asks to raise, release, promote, run CI/CD gates, audit release readiness, update changelog/version, or close implemented issues through a release PR.
---

# Raise to the Sublime Degree

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Symbolism

Raise the candidate on the Five Points of Fellowship with the Lion's Paw so the work can stand without "the flesh sloughing from the bone."

## Purpose

Perform a strict pre-flight before creating a pull request from `preview` to `main`.

This skill blocks promotion when CI/CD or release-readiness checks fail, and only proceeds to PR generation when all audit points pass.
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
4. Standard `/raise` may update release artifacts (`CHANGELOG.md`, `package.json`, `package-lock.json`, and release PR body files) when the release diff proves they are stale. During `--audit-only`, do not mutate files; output the exact edits that would be made.
5. Keep pre-flight scope focused on the release diff from the last shared commit of `origin/main` and `origin/preview` to `origin/preview`.
6. If any gate fails or audit is ambiguous, switch to Plan Mode and output a remediation plan.
7. If clarification is needed from the developer, ask explicit questions in chat (use Cursor question flow) before making assumptions.
8. If raise is allowed and invocation is not `--audit-only`, execute push + PR creation without asking for extra confirmation.
9. For any PR targeting `main`, write the change summary as public-facing release copy: name user-visible features and behavior changes specifically, but avoid exposing implementation details, branch mechanics, internal file paths, database objects, vendor tooling, or agent workflow minutiae in the summary. Keep operational details in later checklist sections.
10. During release raise, identify GitHub issues whose requested work is fully implemented by `preview` since its last merge with `main`, and close them through the release PR using `Closes #<n>` / `Fixes #<n>` keywords. Do not close partial, ambiguous, blocked, perpetual, duplicate, invalid, wontfix, already-closed, or epic/container issues.
11. Determine the next app version from `origin/main:package.json` and the release scope. Never increment the major version unless the user explicitly asks for a major release.
12. Treat production release readiness as two phases: the release PR into `main`, then the post-merge production readiness workflow and manual Vercel promotion.

## Workflow

Copy this checklist and track it while running:

```markdown
Raise Progress
- [ ] 1) Confirm release branches, sync state, and diff scope
- [ ] 2) Build release inventory from preview since main
- [ ] 3) Determine version and update release artifacts
- [ ] 4) Identify issues to close with the release PR
- [ ] 5) The Lion's Paw: run full CI/CD local gates
- [ ] 6) Release readiness audit
- [ ] 7) Decide raise/no-raise
- [ ] 8) Generate PR title/body, push, open PR, and report next gates
```

### 1) Confirm release branches, sync state, and diff scope

Capture:

- current branch name
- source branch (`preview` by default)
- target base branch (`main` by default)
- working tree status, including staged, unstaged, and untracked files
- tracking status for `origin/main` and `origin/preview`
- existing open release PRs from `preview` to `main`
- `git merge-base origin/main origin/preview`
- `git diff origin/main...origin/preview` scope for release notes, docs, version, and issue checks

Run:

```powershell
git fetch origin main preview --tags
git status --short --branch
git diff --stat origin/main...origin/preview
gh pr list --base main --head preview --state open
```

If the source branch is not `preview`, stop and ask for a user decision unless the user explicitly supplied a different source. Do not raise a feature branch directly to `main` by accident.

### 2) Build release inventory from preview since main

Review the full release scope from `origin/main...origin/preview`, not only the latest commit.

Discovery sources:

- `git log --oneline --decorate origin/main..origin/preview`
- `git diff --name-status origin/main...origin/preview`
- `git diff origin/main...origin/preview -- CHANGELOG.md README.md package.json package-lock.json supabase/migrations/`
- merged PR titles and bodies in the commit history
- issue references in commits, PR bodies, changelog entries, roadmap entries, and code comments

Classify release contents as:

- **customer-visible feature**: new or meaningfully expanded user workflow
- **customer-visible fix**: bug fix, compliance fix, security fix, reliability fix, or UX correction
- **customer-visible polish**: small but visible improvement
- **internal-only**: CI, tests, docs, agent workflow, refactor, dependency, or maintenance work with no customer-facing behavior change
- **migration/schema**: Supabase migration, RLS, RPC, Edge Function, storage, or schema impact

This inventory drives versioning, changelog, public PR summary, close keywords, and internal release notes.

### 3) Determine version and update release artifacts

Read the current released version from `origin/main:package.json`:

```powershell
git show origin/main:package.json
```

Read the candidate preview version from the working tree:

```powershell
node -p "require('./package.json').version"
```

Choose the next version from the main version and the release inventory:

- **patch**: customer-visible fixes, compliance fixes, security fixes, small polish, docs, tests, CI, refactors, dependency updates, and internal workflow changes.
- **minor**: new customer-visible capability, substantial workflow enhancement, or additive product surface.
- **major**: only when the user explicitly says to do a major release or confirms a breaking release. Never infer a major version on your own.

Rules:

1. If `preview` already has the correct next version, keep it.
2. If `preview` has no version bump or the bump is too small/large for the release inventory, update `package.json` and `package-lock.json` to the chosen version.
3. If the required version decision is ambiguous, switch to Plan Mode and ask.
4. Fetch tags and fail the version point if `v<next-version>` already exists and this release contains new customer-visible changes.

Update `CHANGELOG.md` automatically during standard `/raise` when the release inventory includes customer-visible features, fixes, compliance/security changes, schema behavior changes, or meaningful internal release notes. Use `[Unreleased]` or the repo's established release heading format if already present; do not add README release-highlights. During `--audit-only`, report the changelog entries that would be written.

Only require `README.md` edits when setup, public behavior, support/documentation entry points, environment requirements, or user-facing concepts changed.

### 4) Identify issues to close with the release PR

Before the raise decision, scan for open GitHub issues that appear fully implemented by `preview` since the last merge with `main`. This is a release gate for PR body correctness, not a code gate.

Discovery sources:

- issue references in `CHANGELOG.md`, `PROJECT_ROADMAP.md`, commit messages, branch names, and prior PR bodies/comments in the release history
- explicit references in commits and docs: `Fixes #<n>`, `Closes #<n>`, `Resolves #<n>`, `Relates to #<n>`, `follow-up to #<n>`, `epic #<n>`
- open issues whose titles or acceptance criteria match the release inventory
- merged PRs included in `origin/main..origin/preview`

Use `gh issue view <number> --json number,title,state,labels,url,body,comments` for every candidate. Include only issues that are still open and are not labeled `meta: perpetual`, `status: blocked-customer`, `duplicate`, `invalid`, or `wontfix`.

For each candidate, classify:

- `closes`: release evidence satisfies the issue's requested outcome or acceptance criteria; add `Closes #<n>` or `Fixes #<n>` to the release PR body.
- `partial`: release evidence addresses part of the issue but meaningful work remains; mention as related context only.
- `related`: reference is useful context but the issue is not implemented by this release; mention only if it helps reviewers.
- `not-implemented`: reference is incidental or superseded; do not mention in closeout.
- `needs-user-decision`: evidence is ambiguous, acceptance criteria are unclear, or closure depends on product judgment; do not close.

Closing rules:

1. Close issues through the `preview` -> `main` PR body only. Do not run `gh issue close` from `/raise`.
2. Use close keywords only for `closes` candidates.
3. Do not close epic/container issues unless the issue body's acceptance criteria are fully satisfied by this exact release.
4. If an issue needs production verification before closure, classify it as `needs-user-decision` unless the user explicitly approves closing it on merge.
5. During `--audit-only`, output the exact close keywords that would be added to the PR body.

Add an `Issue Closeout` section to the PR body:

```markdown
## Issue Closeout
- Closes #123, #456
- Related but not closed: #789 partial; #790 needs production verification
```

Use `None identified` when no implemented issue candidates are found.

### 5) The Lion's Paw (The Grip): CI/CD hard gate

**Script (recommended, EquipQR repo root):**

```powershell
.\scripts\pr-feedback\Invoke-PrVerification.ps1
```

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

### 6) Release readiness audit

Audit each point against the branch diff and repository sources of truth.

1. **Branch point**: confirm this is a `preview` -> `main` release PR unless the user explicitly supplied a different source/base.
2. **CHANGELOG point**: confirm `CHANGELOG.md` is updated for the release scope/version, or no changelog-worthy changes exist.
3. **Version point**: confirm `package.json` and `package-lock.json` version is correct relative to `origin/main:package.json`, and `v<version>` does not already exist for a new customer-visible release.
4. **README point**: confirm `README.md` still matches behavior/setup introduced by this branch.
5. **Rough edges point**: check for unresolved rough edges in PR scope (dead/stale code, TODO/FIXME/HACK markers, naming/control-flow polish opportunities, stale docs). Apply `common-gavel` and the `master-mason` chisel lens as the rubric; do not mutate code unless requested.
6. **Trestle point**: confirm branch changes align with `PROJECT_ROADMAP.md` and active design intent (trestle-board alignment).
7. **Migration/schema point**: run `git diff origin/main...origin/preview -- supabase/migrations/`. If migrations are present, collect them and ensure the PR body states that `production-release-readiness.yml` applies migrations to production after merge, then runs strict schema drift. Do not instruct manual `apply_migration` as the default path.
8. **Schema drift point**: ensure release PR expectations are fail-closed: production `schema_migrations` drift categories (`pending`, `versionMismatch`, `orphanRemote`) block PRs targeting `main`.
9. **Compliance point**: audit the release diff for multi-tenant scoping, RLS/RBAC, service-boundary, secret-handling, and reviewer/compliance flags. Do not defer compliance issues on a `main` release.

Mark each point as:

- `pass`
- `fail`
- `needs-user-decision`

If any point is `fail` or `needs-user-decision`, do not raise.
If any point is `fail` or `needs-user-decision`, request a switch to Plan Mode and present a remediation plan with explicit questions for required decisions.

### 7) Decide raise/no-raise

- **Raise allowed**: Lion's Paw passes and all release readiness audit points pass.
- **Raise blocked**: any CI failure, audit failure, or unresolved decision.

### 8) The Raising: PR preparation and execution

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

## Release Readiness
- Branch: pass (`preview` -> `main`)
- CHANGELOG: pass
- Version: pass
- README: pass
- Rough edges: pass
- Trestle alignment: pass
- Migration/schema: pass
- Schema drift: pass
- Compliance: pass

## Production Readiness After Merge
- None (no `supabase/migrations/*` files changed in this branch)
  <!-- OR, when migrations are present:
  - After this PR merges to main, `production-release-readiness.yml` applies pending Supabase migrations to production, runs strict schema drift, and waits for the matching Vercel `main` deployment to become READY:
    - `YYYYMMDDHHMMSS_name.sql` — one-line purpose
    - `YYYYMMDDHHMMSS_name.sql` — one-line purpose
  -->
- Manual production traffic promotion remains in Vercel after Production Release Readiness is green.

## Issue Closeout
- None identified
  <!-- OR:
  - Closes #123, #456
  - Related but not closed: #789 partial; #790 needs production verification
  -->

## Test Plan
- [x] npm run lint
- [x] npx tsc --noEmit
- [x] npm test
- [x] npm run build
```

1. Commands to publish and open PR to `main`:

```powershell
git push origin preview
gh pr create --base main --head preview --title "<pr-title>" --body-file "<temp-file>"
```

Always write multiline PR bodies to a UTF-8 temporary file and pass `--body-file`; do not use inline `--body` for release PR markdown.

If invocation is not `--audit-only`, execute these commands after a successful raise decision:

- commit release artifact updates when needed
- `git push origin preview`
- `gh pr create --base main --head preview --title "<pr-title>" --body-file "<temp-file>"`
- report the PR URL and issue close keywords included in the PR body
- watch or report GitHub PR checks as the next gate; local checks are not a substitute for release PR CI

Return the PR URL in output.

## Output Contract

1. **Release Scope** (merge-base, commit range, changed areas, release inventory)
2. **Version Decision** (main version, preview version, chosen next version, rationale)
3. **Release Artifact Results** (`CHANGELOG.md`, `package.json`, `package-lock.json`, `README.md`)
4. **Gate Results** (each CI command with pass/fail)
5. **Release Readiness Audit Table** (point, status, evidence)
6. **Issue Closeout** (candidate issue, classification, close keyword action, evidence)
7. **Raise Decision** (`allowed` or `blocked`)
8. **If blocked:** remediation checklist
9. **If allowed + --audit-only:** PR title, PR body draft, push/open commands, and close keywords that would be used
10. **If allowed + standard `/raise`:** release artifact commits if any, PR title, PR body, executed push/open commands, issue closeout results, PR URL, and next GitHub checks/readiness steps

## Guardrails

- Do not claim pass/fail without command or diff evidence.
- Do not skip `lint` or TypeScript checks.
- Do not skip Plan Mode when blocked; request it explicitly.
- Do not proceed past ambiguity without asking the developer direct clarification questions in chat.
- Do open the PR automatically for standard `/raise` once all gates pass (unless `--audit-only` was used).
- Do not fabricate changelog/version rationale.
- Do not increment the major version unless the user explicitly requested a major release.
- Do not treat roadmap speculation as trestle alignment evidence.
- Do not tell the maintainer to manually run Supabase migration promotion by default; the post-merge Production Release Readiness workflow owns that path.
- Do not omit production readiness notes when `supabase/migrations/*` files are in scope.
- Do not use close keywords for perpetual, blocked-customer, duplicate, invalid, wontfix, closed, partial, ambiguous, or epic/container issues.
- Do not close issues with direct `gh issue close`; close implemented issues through the merged release PR.
