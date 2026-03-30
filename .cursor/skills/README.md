# Master Workman's Codebase Toolkit

This repository skill suite uses the working tools of Freemasonry as a command map for keeping the codebase "perfectly shaped."

Every skill in this folder should be treated as:

- project-scoped
- idempotent
- evidence-first
- respectful of existing patterns
- developer-in-the-loop for destructive or behavior-changing work

## Command Map

| Command | Primary use |
| --- | --- |
| `/common-gavel` | Remove confirmed superfluities, repair doc drift, then automatically polish touched code |
| `/trestle` | Align roadmap, architecture, and recent commit intent |
| `/pencil` | Draft technical specifications, schemas, and file scaffolding before implementation |
| `/gauge` | Audit performance, latency, and resource efficiency |
| `/square` | Check architecture, naming, and structural consistency |
| `/plumb` | Audit security posture, secrets, and compliance readiness |
| `/level` | Audit accessibility and device parity |
| `/compasses` | Check boundary guards, permissions, tenancy, and runaway execution controls |
| `/trowel` | Audit dependency health and integration seams |
| `/chisel` | Polish existing code without deleting behavior |
| `/raise` | Run PR pre-flight gates and prepare promotion PR to `main` |

## Shared Operating Rules

1. Use the current repository, requested scope, and existing architecture as the baseline.
2. Distinguish confirmed findings from suspicions. Confidence matters.
3. Ask before deleting ambiguous code, changing behavior, or broadening scope.
4. Prefer targeted improvements over sweeping rewrites.
5. Report what was verified, what remains uncertain, and what evidence supports each claim.
6. If a skill finds no actionable issues, say so plainly.

## Overlap Guide

- `common-gavel` is the only cleanup skill that should delete confirmed dead code or prune stale docs, and it automatically follows with a polish pass on touched files.
- `chisel` is polish-only. It improves clarity, types, and maintainability without deleting logic or acting as a doc cleanup pass.
- `square` checks whether code fits the repository's architectural rules and folder logic.
- `plumb` checks broad security and regulatory uprightness.
- `compasses` checks operational boundaries such as authz, rate limits, tenant isolation, and guardrails.
- `level` checks whether users on different devices or with assistive needs receive an equal experience.
- `trowel` checks whether modules, APIs, and dependencies remain bonded together coherently.

## Suggested Use

Use the skill whose primary question best matches the task:

- "What should be removed or updated?" -> `common-gavel`
- "What should we build next?" -> `trestle`
- "How should this feature be specified?" -> `pencil`
- "Why is this expensive or slow?" -> `gauge`
- "Does this fit our architecture?" -> `square`
- "Is this secure and compliant?" -> `plumb`
- "Is this accessible and device-safe?" -> `level`
- "Are our boundaries and permissions tight enough?" -> `compasses`
- "Are our dependencies and integrations healthy?" -> `trowel`
- "Can this code be made cleaner without changing behavior?" -> `chisel`
- "Is this branch ready to be raised to main?" -> `raise`
