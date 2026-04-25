---
name: trestle
description: Use when aligning current repository state with roadmap priorities, reconciling GitHub issues or organization project items with what exists in the codebase, or deriving next steps across code, docs, and EquipQR work tracking.
---

# Trestle

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Symbolism

The trestle board is where the master lays out the design before the work begins.

In EquipQR, that planning surface can live in the repository, in `PROJECT_ROADMAP.md`, in GitHub issues, or in the organization project board.

## Purpose

Analyze the current repository structure, recent project movement, design documents, and GitHub tracking state, then update the planning surface that best matches the request.

Use this skill to surface planned-but-unbuilt work, built-but-untracked work, stale GitHub tracking, issue and PR triage needs, and the next logical sequence of implementation across code, docs, issues, pull requests, and the EquipQR organization project.

## Invocation

- `/trestle`
- `/trestle <optional-scope-path>`
- `/trestle github`
- `/trestle issues`
- `/trestle project`

## Operating Rules

1. Ground roadmap and GitHub changes in repository evidence, issue history, and current project state, not aspiration alone.
2. Separate analysis from mutation. Audit freely; create, edit, close, or reprioritize GitHub artifacts only when the user asked for it.
3. Prefer updating existing planning surfaces (`PROJECT_ROADMAP.md`, issues, and project items) over replacing them wholesale.
4. Separate committed implementation, documented intent, active GitHub tracking, and speculation.
5. Mark gaps in docs but not code as `planned-not-built`; mark gaps in code but not GitHub tracking as `built-not-tracked`.
6. Use `gh` for GitHub repository and project work. Use explicit owner and repo targeting when scope could be ambiguous.
7. Read project fields before updating project items. Project field changes require precise IDs, and only one field value can be changed per `gh project item-edit` call.

## Quick Reference

- Repository tracking: `gh issue list --repo Columbia-Cloudworks-LLC/EquipQR`, `gh search issues --owner Columbia-Cloudworks-LLC --archived=false`, `gh search issues --include-prs --owner=Columbia-Cloudworks-LLC`
- Triage pass: confirm label, assignee, milestone, project membership, duplicate status, blocker status, and next action
- Issue mutations: `gh issue create ... --project "<project title>"`, `gh issue edit <number> ... --add-project "<project title>"`
- PR mutations: `gh pr edit <number> ... --add-project "<project title>"`
- Project inspection: `gh project view <number> --owner Columbia-Cloudworks-LLC`, `gh project field-list <number> --owner Columbia-Cloudworks-LLC`, `gh project item-list <number> --owner Columbia-Cloudworks-LLC`
- Project mutations: `gh project item-create <number> --owner Columbia-Cloudworks-LLC ...`, `gh project item-edit ...`
- Advanced GitHub operations: use `gh api` when high-level commands do not expose the needed fields or filters
- Auth note: project mutations require GitHub auth with `project` scope

## Workflow

Copy this checklist and track it while running:

```markdown
Trestle Progress
- [ ] 1) Confirm scope, planning horizon, and mutation authority
- [ ] 2) Inspect repository structure and recent commits
- [ ] 3) Inspect GitHub tracking surfaces
- [ ] 4) Compare implementation with design docs, issues, and project state
- [ ] 5) Identify planned-not-built and built-not-tracked work
- [ ] 6) Draft or update roadmap and GitHub artifacts
- [ ] 7) Report next steps, risks, and open questions
```

### 1) Confirm scope, planning horizon, and mutation authority

Capture the target area, the expected planning window, whether the task is repository-only or organization/project-wide, and whether you are authorized to mutate GitHub state or only audit it.

### 2) Inspect repository structure and recent commits

Review the current architecture, major directories, and recent commit intent to understand what work is active, stable, blocked, or partially complete.

### 3) Inspect GitHub tracking surfaces

Review GitHub issues, pull requests when relevant, labels, milestones, and the EquipQR organization project to understand tracked, stale, blocked, duplicated, or missing work.

Use `gh` as the default GitHub interface. Prefer explicit targeting such as `--repo Columbia-Cloudworks-LLC/EquipQR` and `--owner Columbia-Cloudworks-LLC`. If project commands fail, refresh auth with project scope before mutation work.

### 4) Compare implementation with design docs, issues, and project state

Check docs, specs, existing roadmap material, issues, and project items against the code to find:

- planned features not yet built
- work that was started but not completed
- built changes that are not tracked in GitHub
- pull requests that landed work without corresponding tracking updates
- stale or duplicate issues and project items
- architecture drift that changes the order of future work

### 5) Identify planned-not-built and built-not-tracked work

For each gap, record:

- the source of truth
- the missing implementation surface
- the missing or stale GitHub artifact
- dependencies or blockers
- confidence that the gap is real

### 6) Draft or update roadmap and GitHub artifacts

Use the surface that fits the request:

- `PROJECT_ROADMAP.md` for local sequencing and longer-form notes
- GitHub issues for actionable units of work
- GitHub project items and field values for status, priority, and portfolio tracking
- `gh api` for repo or project workflows not fully covered by high-level subcommands

When mutating GitHub, prefer updating existing issues and items over duplicating them. Capture the project number, project ID, item ID, field ID, and target value before changing project fields.

### 7) Report next steps, risks, and open questions

Summarize what changed locally and on GitHub, what remains blocked, and what assumptions still need confirmation from the developer.

## Output Contract

1. **Architecture and Tracking Snapshot** (repository and GitHub state in scope)
2. **Planned-Not-Built / Built-Not-Tracked Findings** (with evidence)
3. **Roadmap / GitHub Update Summary**
4. **Artifact Status** (`created`, `updated`, `closed`, `reopened`, or `no change needed`)
5. **Next Step**

## Guardrails

- Do not invent commitments that are not grounded in repository, documentation, or GitHub evidence.
- Do not create, close, or reprioritize GitHub issues or project items unless the user asked for mutation.
- Do not move project items or set statuses without first reading available project fields and confirming the target field and value.
- Do not duplicate existing issues or project items when an update, comment, or label change is sufficient.
- Do not treat unfinished exploratory code or issue discussion as a committed roadmap item unless supporting evidence exists.
- Do not rewrite product strategy when the task only requires implementation sequencing or tracking hygiene.
