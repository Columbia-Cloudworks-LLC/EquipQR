# Reporting

## Output Files

Create a run folder:

- `docs/audit-readiness/<YYYY-MM>/<jurisdiction>/<run-slug>/`

Write:

- `evidence-inventory.md`
- `evidence-package.md`
- `executive-report.md`
- `visual-appendix.md`
- `assets/` (screenshots, charts, diagrams)

## Artifact Purpose

- `evidence-inventory.md`: indexed control-to-artifact summary
- `evidence-package.md`: detailed exhibits, observations, and supporting notes
- `executive-report.md`: leadership-facing summary and findings
- `visual-appendix.md`: visuals tied to specific controls/findings

## Executive Report Structure

Use this section order:

1. Executive Summary
2. Scope And Method
3. Control Results Summary
4. Detailed Findings
5. Visual Appendix Reference

## Control Results Statuses

Use only:

- `verified`
- `failed`
- `not verified`
- `blocked`

## Table Schemas

### Control Results Summary

| Control/Question | Status | Evidence Artifacts | Notes |
| --- | --- | --- | --- |

### Evidence Inventory

| Control/Question | Artifact ID | Source | Timestamp (UTC) | Reproducibility Marker |
| --- | --- | --- | --- | --- |

## Visual Appendix Rules

Include visuals only when they materially clarify findings:

- production UI screenshots from `https://equipqr.app`
- entity-relationship diagrams from production database structures
- charts for production entity counts/relationships
- production Vercel visuals tied to control evidence

Each visual must include:

- control/question linkage
- source label
- capture context
- redaction notes when applicable

## Sensitive Data Rules

- redact secrets, tokens, and personal data
- avoid including unnecessary raw sensitive payloads
- keep enough context for audit traceability without exposing prohibited data

## Unsupported Evidence Cases

If a control cannot be safely evidenced:

- classify as `blocked` or `not verified`
- explain why
- do not infer or fabricate supporting evidence
