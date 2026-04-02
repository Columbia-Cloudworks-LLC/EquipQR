# Inputs

## Input Modes

Use this decision order:

1. **Auditor-driven (preferred)**
2. **Standalone (fallback)**

```dot
digraph evidence_input_mode {
    "Prior auditor output available?" [shape=diamond];
    "Use auditor Scope + Questions + Matrix" [shape=box];
    "Use standalone jurisdiction/regulatory scope" [shape=box];

    "Prior auditor output available?" -> "Use auditor Scope + Questions + Matrix" [label="yes"];
    "Prior auditor output available?" -> "Use standalone jurisdiction/regulatory scope" [label="no"];
}
```

## Auditor-Driven Mode

When available, ingest:

- `Scope`
- `Audit Questions`
- `Pass-Fail Matrix`

This becomes the evidence checklist.

If jurisdiction overlaps with existing rule packs (for example Texas), preserve the same question ordering used by `auditor` to avoid divergent narratives.

## Standalone Mode

If no prior `auditor` output exists:

- require explicit jurisdiction/regulatory scope
- construct checklist from approved audit rule-pack material
- state assumptions before collecting evidence

## Expected Auditor Output Location

If file-path based handoff is needed, look under:

- `docs/audit-readiness/`

Use the latest user-confirmed artifact as source of truth.

## Missing Input Handling

If neither auditor output nor clear standalone scope is available:

- stop
- request missing scope inputs
- do not collect evidence on an implied scope
