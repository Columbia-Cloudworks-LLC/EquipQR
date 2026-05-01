---
name: pencil
description: Use when the user has a high-level feature idea and needs a technical specification, API contracts, data models, or file scaffolding before implementation begins.
---

# Pencil

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Symbolism

The pencil records the design so the work can be squared later.

## Purpose

Turn a high-level feature request into a detailed technical specification without implementing production logic yet.

This skill focuses on structure, interfaces, data shapes, acceptance criteria, and file layout so implementation can begin from a clear design instead of guesswork.

## Invocation

- `/pencil`
- `/pencil <feature-or-scope>`

## Operating Rules

1. Confirm the feature goal, user outcome, and constraints before drafting.
2. Follow existing repository architecture, naming, and tenancy or permission patterns.
3. Separate confirmed requirements from assumptions and open questions.
4. Provide schemas, contracts, and file scaffolding, but do not implement business logic unless explicitly asked.
5. End with a spec that is actionable for implementation and review.

## Workflow

Copy this checklist and track it while running:

```markdown
Pencil Progress
- [ ] 1) Confirm feature scope and success criteria
- [ ] 2) Read nearby architecture and existing patterns
- [ ] 3) Define user flow and acceptance criteria
- [ ] 4) Draft data model and API contracts
- [ ] 5) Outline file structure and boilerplate
- [ ] 6) Record risks, dependencies, and open questions
- [ ] 7) Recommend the execution model for the implementation phase
```

### 1) Confirm feature scope and success criteria

Capture the actor, the primary user outcome, non-goals, constraints, and what "done" should mean.

### 2) Read nearby architecture and existing patterns

Inspect the relevant code paths so the spec fits the project's existing approach instead of inventing a parallel one.

### 3) Define user flow and acceptance criteria

Write the expected behavior from entry point to success, including important failure states and permission or validation constraints.

### 4) Draft data model and API contracts

Include the interfaces needed to implement the feature:

- request and response shapes
- persistent data fields
- validation rules
- side effects and integrations

### 5) Outline file structure and boilerplate

List the files, modules, or directories that should exist and what responsibility each one owns. When useful, include minimal skeleton signatures without implementing logic.

### 6) Record risks, dependencies, and open questions

Call out blockers, assumptions, sequencing concerns, and decisions that still need human approval.

### 7) Recommend the execution model for the implementation phase

Load the [model-recommender](../model-recommender/SKILL.md) skill, pass the work shape inferred from the **File Plan / Boilerplate Map** and **Risks and Open Questions** (file count, schema/RLS touches, capability requirements like vision or audio, expected context size), and embed the resulting standardized block verbatim as item 7 of the Output Contract. This tells whoever takes the spec into implementation which specific model and Cursor tier the work warrants — the spec is incomplete without it.

## Output Contract

1. **Feature Summary**
2. **Acceptance Criteria**
3. **Data Model and API Contracts**
4. **File Plan / Boilerplate Map**
5. **Risks and Open Questions**
6. **Ready-for-Implementation Recommendation**
7. **Recommended Execution Model** — standardized block emitted by [model-recommender](../model-recommender/SKILL.md), embedded verbatim. When the recommendation surfaces a constraint (deprecated model, training-policy concern, preview-tier flag), lead this item with a `> ⚠ Note:` callout above the block.

## Guardrails

- Do not start implementing production logic under the guise of scaffolding.
- Do not hide unknowns; list them explicitly.
- Do not invent new architecture if an existing project pattern already fits.
- Do not skip validation, permissions, or tenant-scoping requirements when they apply.
- Do not omit the **Recommended Execution Model** item — load [model-recommender](../model-recommender/SKILL.md) and embed its block verbatim, even when the spec is small. A spec without a model recommendation is incomplete.
