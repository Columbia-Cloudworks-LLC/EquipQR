---
name: evidence-producer
description: Use when producing production-backed audit evidence, screenshots, executive compliance reports, and entity-mapping visuals from equipqr.app, production Supabase, and production Vercel.
---

# Evidence Producer

## Purpose

Produce audit-support evidence and reporting from production systems only.

This skill can run from prior `auditor` output or standalone jurisdiction input, but always enforces production-only boundaries.

## Required Inputs

Use `inputs.md` to determine run mode and checklist source.

## Allowed Sources

Use `sources.md` to enforce production-only scope and provenance.

## Reporting Requirements

Use `reporting.md` to generate evidence outputs, executive reporting, and visual appendix content.

## Core Workflow

Copy this checklist and complete in order:

```markdown
Evidence Producer Progress
- [ ] 1) Determine input mode (auditor-driven preferred)
- [ ] 2) Emit source lock (production only)
- [ ] 3) Map each control/question to evidence source(s)
- [ ] 4) Collect production evidence with provenance
- [ ] 5) Classify each control (`verified`/`failed`/`not verified`/`blocked`)
- [ ] 6) Write required output artifacts
```

### 1) Determine input mode

- Prefer prior `auditor` output when available.
- Otherwise run standalone with explicit jurisdiction/regulatory scope.

### 2) Emit source lock

Before collection, explicitly confirm:

- in-scope: `https://equipqr.app`, production Supabase, production Vercel
- out-of-scope: preview, staging, local, unpublished, speculative features

### 3) Map controls to sources

For each control/question, choose strongest production evidence from:

- browser-observed production behavior
- production database evidence (read-only)
- production Vercel evidence (read-only)
- combined evidence

### 4) Collect with provenance

Every artifact must include:

- control/question mapping
- source system
- UTC timestamp when available
- production confirmation
- reproducibility marker
- concise observation note

### 5) Classify controls

- `verified`: evidence supports the control
- `failed`: evidence contradicts the control
- `not verified`: evidence is inconclusive
- `blocked`: safe/required production access is unavailable

### 6) Write outputs

Produce all required artifacts using `reporting.md`.

### Preflight usability check (before first branded generation)

Confirm or default the output style:

- audience type (legal/regulator/executive/internal)
- findings readability mode (narrative per question preferred for legal)
- exhibit pagination mode (**one screenshot per page** default)
- required metadata fields (URL, UTC timestamp, control IDs answered)

If the user does not specify, use legal-grade defaults.

## Output Contract

Always produce, in order:

1. `Scope`
2. `Source Lock`
3. `Evidence Inventory`
4. `Evidence Package`
5. `Executive Report`
6. `Visual Appendix`

## Guardrails

- Production evidence collection is read-only by default.
- Do not perform destructive production actions for this workflow.
- Do not substitute non-production signals for production evidence.
- Do not claim legal advice or legal certification.
- When sources conflict, document both with provenance and classify from strongest relevant evidence.

## Example Trigger Phrases

- "Produce Texas audit evidence from production"
- "Create executive compliance report from live production"
- "Capture production evidence and entity diagrams for audit controls"
