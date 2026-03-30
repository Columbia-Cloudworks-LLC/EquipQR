---
name: raise
description: Run pull request pre-flight checks and prepare a release PR from the current branch to main. Use when the user asks to raise a branch, run CI/CD gates, audit release readiness, or generate a PR description and open-PR commands.
---

# Raise to the Sublime Degree

## Symbolism

Raise the candidate on the Five Points of Fellowship with the Lion's Paw so the work can stand without "the flesh sloughing from the bone."

## Purpose

Perform a strict pre-flight before creating a pull request from the current branch to `main`.

This skill blocks promotion when CI/CD or release-readiness checks fail, and only proceeds to PR generation when all five audit points pass.

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
6. If any gate fails, halt raising and output a remediation list.

## Workflow

Copy this checklist and track it while running:

```markdown
Raise Progress
- [ ] 1) Confirm branch, base branch, and diff scope
- [ ] 2) The Lion's Paw: run full CI/CD local gates
- [ ] 3) Five Points of Fellowship audit
- [ ] 4) Decide raise/no-raise
- [ ] 5) Generate PR title, body, and open-PR commands
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

- stop the process immediately
- mark status as `raise halted`
- list failing command(s) and first actionable fix hints

### 3) The Five Points of Fellowship (The Audit)

Audit each point against the branch diff and repository sources of truth.

1. **CHANGELOG point**: confirm `CHANGELOG.md` is updated for the release scope/version.
2. **Version point**: confirm `package.json` and `package-lock.json` version is correct for the release intent.
3. **README point**: confirm `README.md` still matches behavior/setup introduced by this branch.
4. **Rough edges point**: check for unresolved rough edges in PR scope (dead/stale code, TODO/FIXME/HACK markers, naming/control-flow polish opportunities, stale docs). Apply `common-gavel` and `chisel` standards as the rubric; do not mutate code unless requested.
5. **Trestle point**: confirm branch changes align with `PROJECT_ROADMAP.md` and active design intent (trestle-board alignment).

Mark each point as:

- `pass`
- `fail`
- `needs-user-decision`

If any point is `fail` or `needs-user-decision`, do not raise.

### 4) Decide raise/no-raise

- **Raise allowed**: Lion's Paw passes and all Five Points pass.
- **Raise blocked**: any CI failure, audit failure, or unresolved decision.

### 5) The Raising: PR preparation output

When raise is allowed, produce:

1. Proposed PR title.
1. PR body in this format:

```markdown
## Summary
- ...
- ...
- ...

## Five Points of Fellowship
- CHANGELOG: pass
- Version: pass
- README: pass
- Rough edges: pass
- Trestle alignment: pass

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

## Output Contract

1. **Gate Results** (each CI command with pass/fail)
2. **Five Points Audit Table** (point, status, evidence)
3. **Raise Decision** (`allowed` or `blocked`)
4. **If blocked:** remediation checklist
5. **If allowed:** PR title, PR body draft, push/open commands

## Guardrails

- Do not claim pass/fail without command or diff evidence.
- Do not skip `lint` or TypeScript checks.
- Do not open a PR automatically unless user explicitly asks to execute.
- Do not fabricate changelog/version rationale.
- Do not treat roadmap speculation as trestle alignment evidence.
