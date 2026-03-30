---
name: trestle
description: Use when aligning current repository state with roadmap priorities, deriving next development steps from recent commits, or reconciling planned features in docs with what exists in the codebase.
---

# Trestle

## Symbolism

The trestle board is where the master lays out the design before the work begins.

## Purpose

Analyze the current repository structure and recent project movement, then generate or update `PROJECT_ROADMAP.md` so the next steps match the architecture that actually exists.

Use this skill to surface planned-but-unbuilt work, missing follow-through from earlier design decisions, and the next logical sequence of implementation.

## Invocation

- `/trestle`
- `/trestle <optional-scope-path>`

## Operating Rules

1. Ground roadmap updates in repository evidence, not aspiration alone.
2. Prefer updating an existing `PROJECT_ROADMAP.md` over replacing it wholesale.
3. Separate committed implementation, documented intent, and speculation.
4. Mark planned features that are missing in implementation as `planned-not-built`.
5. Keep roadmap steps ordered, scoped, and testable.

## Workflow

Copy this checklist and track it while running:

```markdown
Trestle Progress
- [ ] 1) Confirm scope and planning horizon
- [ ] 2) Inspect repository structure and recent commits
- [ ] 3) Compare implementation with design docs and plans
- [ ] 4) Identify planned-not-built features
- [ ] 5) Draft or update PROJECT_ROADMAP.md
- [ ] 6) Report next steps, risks, and open questions
```

### 1) Confirm scope and planning horizon

Capture the target area, the expected planning window, and whether the user wants a repository-wide roadmap or a focused subsystem roadmap.

### 2) Inspect repository structure and recent commits

Review the current architecture, major directories, and recent commit intent to understand what work is active, stable, blocked, or partially complete.

### 3) Compare implementation with design docs and plans

Check docs, specs, and existing roadmap material against the code to find:

- planned features not yet built
- work that was started but not completed
- architecture drift that changes the order of future work

### 4) Identify planned-not-built features

For each gap, record:

- the source of the plan
- the missing implementation surface
- dependencies or blockers
- confidence that the gap is real

### 5) Draft or update `PROJECT_ROADMAP.md`

Use a structure like:

- `Current State`
- `Next Logical Steps`
- `Planned-Not-Built`
- `Risks and Dependencies`
- `Open Questions`

### 6) Report next steps, risks, and open questions

Summarize what should happen next, what is blocked, and what assumptions still need confirmation from the developer.

## Output Contract

1. **Architecture Snapshot** (current repository state in scope)
2. **Planned-Not-Built Findings** (with evidence)
3. **Roadmap Update Summary**
4. **Roadmap File Status** (`created`, `updated`, or `no change needed`)
5. **Next Step**

## Guardrails

- Do not invent commitments that are not grounded in repository evidence.
- Do not label a feature missing without citing the source plan or documentation.
- Do not treat unfinished exploratory code as a committed roadmap item unless supporting evidence exists.
- Do not rewrite product strategy when the task only requires implementation sequencing.
