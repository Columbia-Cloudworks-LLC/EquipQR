# Reporting

## Branding — Columbia Cloudworks LLC

All output documents are authored on behalf of **Columbia Cloudworks LLC**. Apply consistent branding:

- Header/title: include **Columbia Cloudworks LLC** and **EquipQR** where appropriate
- Tone: professional, technically credible, enterprise-grade
- For Word toolkit deliverables: the template applies branding automatically (logo, headers/footers, colors)
- For customer-facing reports: lead with a brief company context line and date
- Never use informal language, emojis, or AI-attribution phrasing in deliverable content

## Output Files

### Repository artifacts (default)

Create a run folder:

- `docs/audit-readiness/<YYYY-MM>/<jurisdiction>/<run-slug>/`

Write:

- `evidence-inventory.md`
- `evidence-package.md`
- `executive-report.md`
- `visual-appendix.md`
- `assets/` (screenshots, charts, diagrams)

### Branded deliverables (Word Toolkit)

When the user asks for a shareable or customer-ready document, use the Columbia Cloudworks Word automation toolkit. Do **not** use `gws docs` for product deliverable generation.

**Workflow:**

1. Build a JSON manifest matching the `audit-packet-schema.json` schema (see `toolbelt` skill, section 9).
2. Write the manifest to a temporary file in the project (e.g., `tmp/documents/manifest.json`).
3. Run from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\viral\Documents\ColumbiaCloudworks\doc-automation\scripts\New-BrandedDocument.ps1" -ManifestPath "tmp\documents\manifest.json"
```

4. Output lands in `tmp/documents/` as both `.docx` and `.pdf`.

**Manifest structure for audit packets:**

- `title`: e.g., "Columbia Cloudworks LLC — Texas Audit Evidence Package — 2026-04"
- `customer`: "Columbia Cloudworks LLC"
- `date`: ISO date string
- `confidentiality`: "Confidential"
- `sections`: array with tags `ExecSummary`, `ScopeMethod`, `ControlResults`, `DetailedFindings`, `VisualAppendix`
- Each section can have `content` (text), `table` (headers + rows), and/or `images` (path + caption)

## Audit Preflight (Required for Branded Packets)

Before generating the first branded document, confirm:

1. Primary reader: legal counsel, regulator, executive, or internal compliance
2. Findings format: narrative per question (default) or compact table
3. Exhibit layout: **one screenshot per page** (default and recommended)
4. Evidence traceability fields: URL + UTC timestamp + control IDs answered

Default when unspecified: legal-review narrative format + one exhibit per page.

The template applies all branding automatically: cover page logo, headers with logo + company name + document title, footers with confidentiality + page numbers, accent-colored table headers, and status keyword coloring (Verified = green, Failed = red, Not Verified/Blocked = amber).

### Screenshot handling

Browser screenshots are saved to `tmp/screenshots/` (gitignored). Follow the Screenshot Workflow in the `toolbelt` skill for capture and copy steps. Use evidence-specific filenames (e.g., `txr-ac-1-rbac-settings.png`).

To embed screenshots in the branded deliverable, reference them in the manifest's `images` array with paths relative to the project root:

```json
{
  "path": "tmp/screenshots/txr-ac-1-rbac-settings.png",
  "caption": "Figure 1: RBAC settings page showing role enforcement"
}
```

Screenshots are embedded directly into the Word document body at full page width with captions — no Drive upload or link-sharing required.

### Audit exhibit page standard (default)

For legal-grade evidence packets, each exhibit must render as:

1. Exhibit heading at top of page (`E-### ...`)
2. Screenshot image
3. Readable metadata block under image (larger text)

Use one screenshot per page to prevent exhibit mixing during pagination.

Preferred manifest image shape:

```json
{
  "path": "tmp/screenshots/tx-audit-log.png",
  "title": "E-005 Audit Log and Retention Statements",
  "details": "Production audit-log surface used to support access/accountability and retention-related controls.",
  "source": "EquipQR App",
  "url": "https://equipqr.app/dashboard/audit-log",
  "capturedUtc": "2026-04-06T17:05:33Z",
  "answers": ["TXR-AC-3", "TXR-AC-4", "TDP-DSAR-6", "TDBN-6", "TXST-6"]
}
```

If only `caption` is present, the generator supports legacy parsing, but structured fields above are preferred.

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

For audit deliverables, visuals are not optional decoration: they are required evidence exhibits tied to question/control IDs.

## Question-to-Exhibit Mapping (Required)

Include a first-class control-to-exhibit map in both:

- `evidence-inventory.md`
- branded deliverable (`DetailedFindings` section or dedicated mapping section)

Minimum columns:

| Control/Question ID | Law/Regime | Finding | Exhibit IDs |
| --- | --- | --- | --- |

## Sensitive Data Rules

- redact secrets, tokens, and personal data
- avoid including unnecessary raw sensitive payloads
- keep enough context for audit traceability without exposing prohibited data

## Unsupported Evidence Cases

If a control cannot be safely evidenced:

- classify as `blocked` or `not verified`
- explain why
- do not infer or fabricate supporting evidence
