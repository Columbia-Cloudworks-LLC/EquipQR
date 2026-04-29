---
name: auditor
description: Use when generating a jurisdiction-specific audit questionnaire and pass-fail compliance matrix from a regulatory rule pack, such as Texas audit readiness requests.
---

# Auditor

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Purpose

Generate a deterministic audit questionnaire and pass-fail matrix for a named regulatory space.

This skill only produces:

1. Scope assumptions
2. Audit questions
3. Pass-fail matrix
4. Coverage gaps (if the rule pack is incomplete)

## Not In Scope

Do not produce:

- developer remediation guidance
- implementation instructions
- browser workflows
- screenshot capture steps
- printable report assembly
- evidence collection playbooks

If the user asks for those, stop after this output and recommend the `evidence-producer` skill for evidence collection and the Columbia Cloudworks Word automation toolkit (see `toolbelt` skill, section 9) for branded deliverable generation.

## Invocation

- `/auditor texas`
- "Generate Texas audit questions and pass/fail matrix"
- "Create an audit questionnaire for Texas compliance readiness"

## Rule Packs

Load a jurisdiction reference from this directory:

- `texas.md`

If the jurisdiction is unsupported, say so and list available packs.

## Workflow

Copy this checklist and complete in order:

```markdown
Auditor Progress
- [ ] 1) Confirm jurisdiction and assumptions
- [ ] 2) Load matching rule pack
- [ ] 3) Emit fixed audit questions by regime
- [ ] 4) Build pass-fail matrix from rule-pack logic
- [ ] 5) Report coverage gaps without inventing requirements
```

### 1) Confirm jurisdiction and assumptions

State:

- jurisdiction name
- regulatory regimes covered by the pack
- applicability assumptions when needed

### 2) Load matching rule pack

Use only mapped requirements from the pack.
Do not add legal requirements from memory.

### 3) Emit fixed audit questions by regime

Use the same regime order and question order defined in the pack.

### 4) Build pass-fail matrix

Create a matrix using this schema:

| Regime | Area | Audit Question | Pass When | Fail When |
| --- | --- | --- | --- | --- |

Rules:

- keep language deterministic and testable
- map each row to a question or control area from the pack
- avoid advice text in matrix cells

### 5) Report coverage gaps

If requirements are missing or ambiguous in the pack, add a short `Coverage Gaps` section.

## Output Contract

Always return, in this exact order:

1. `Scope`
2. `Audit Questions`
3. `Pass-Fail Matrix`
4. `Coverage Gaps` (only if needed)

## Formatting Contract

- Use concise markdown headings
- Group questions by regime and area
- Keep question wording auditor-facing
- Keep matrix rows one control intent per row

## Guardrails

- Do not claim legal certification or legal advice
- Do not invent citations not present in the rule pack
- Do not mix developer and auditor outputs
- Do not include evidence-production instructions

## Example (Texas)

When asked for Texas:

1. Load `texas.md`
2. Emit the regime-ordered questionnaire
3. Emit the pass-fail matrix based on Texas pass-fail logic
4. Stop
