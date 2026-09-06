# Cursor skills index

Canonical discovery index for `.cursor/skills/`. **Invoke When** is copied from the YAML `description` on each skill.

| Skill Name | Invoke When | Entry File |
|---|---|---|
| address-pr-feedback | Triage, implement, and respond to pull request review feedback in Agent Mode. Wait for CI, prioritize red checks, implement when scope is clear, Plan Mode only when the round is complex. Qodo is retired. Use when the user asks to fix, resolve, or respond to PR review comments. | `.cursor/skills/address-pr-feedback/SKILL.md` |
| dependabot-merge-ready | Resolve a Dependabot PR to merge-ready (changelog `[Unreleased]`, CI/Supabase). Use when the user gives a Dependabot PR number or asks to land a dependency update. | `.cursor/skills/dependabot-merge-ready/SKILL.md` |
| issue-clarification | Clarify one open GitHub issue (users, problem, success criteria, codebase findings) and rewrite the issue on GitHub. Does not implement. Manual invoke (`/issue-clarification`). | `.cursor/skills/issue-clarification/SKILL.md` |
| itil-change-record | Write a Composer 2.5 executable plan when the user asks for a plan or approval-ready scope before code. Hands execution to itil-issue-resolver or normal Agent-mode after approval. Does not force a PR. | `.cursor/skills/itil-change-record/SKILL.md` |
| itil-incident-record | Lightweight bug intake. Capture one symptom and the evidence needed. No mandatory multi-MCP sweep. Hands off to implementation or deeper triage. | `.cursor/skills/itil-incident-record/SKILL.md` |
| itil-issue-resolver | Implement one approved issue or small change. Default is local-iterate on the current checkout. Open a merge-ready PR only when the user asked to publish or land the issue on preview. | `.cursor/skills/itil-issue-resolver/SKILL.md` |
| itil-problem-record | Lightweight root-cause triage for one bug issue. Concise problem summary, then hand off to itil-issue-resolver when the user authorizes implementation. | `.cursor/skills/itil-problem-record/SKILL.md` |
| itil-service-request | Lightweight feasibility and dollar-cost scope for one feature or vendor request. No code changes. | `.cursor/skills/itil-service-request/SKILL.md` |
| release | Cut a production release via preview → main. Use when the user runs `/release` or asks to ship to production. | `.cursor/skills/release/SKILL.md` |
| thermo-nuclear-full-codebase-audit | Task-subagent code quality audit. Invoked by a parent that already gathered the tree and file contents. | `.cursor/skills/thermo-nuclear-full-codebase-audit/SKILL.md` |

## Needs entry file

**None.** Every immediate subdirectory of `.cursor/skills/` contains a top-level `SKILL.md`.
