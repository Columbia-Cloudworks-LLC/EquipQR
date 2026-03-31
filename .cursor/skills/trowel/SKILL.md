---
name: trowel
description: Use when auditing dependency health, API contract consistency, shared data shapes, or brittle integration seams between modules, services, and packages.
---

# Trowel

## Symbolism

The trowel spreads the cement that unites separate parts into one sound building.

## Purpose

Audit the bonds between modules, services, dependencies, and APIs so the codebase remains cohesive instead of fragile.

This skill focuses on dependency health, contract consistency, and integration points that are likely to crack under change.

## Invocation

- `/trowel`
- `/trowel <optional-scope-path>`

## Operating Rules

1. Inspect both dependency declarations and real integration seams.
2. Distinguish stale or risky dependencies from harmless version lag.
3. Compare frontend and backend contracts where data crosses boundaries.
4. Favor fixes that reduce brittleness and duplication at the seam.
5. Explain integration risk in terms of breakage modes, not only version numbers.

## Workflow

Copy this checklist and track it while running:

```markdown
Trowel Progress
- [ ] 1) Confirm scope and major integration seams
- [ ] 2) Review dependency declarations and usage patterns
- [ ] 3) Compare API and data-shape contracts across boundaries
- [ ] 4) Identify brittle or inconsistent integration points
- [ ] 5) Propose cohesion fixes
```

### 1) Confirm scope and major integration seams

Identify where the target area connects to other modules, services, packages, APIs, or generated artifacts.

### 2) Review dependency declarations and usage patterns

Check for:

- unused or suspicious dependencies
- overlapping libraries solving the same problem
- outdated packages that create real compatibility or security risk
- scripts or tooling references that no longer match actual usage

### 3) Compare API and data-shape contracts across boundaries

Verify that the producer and consumer agree on field names, types, nullability, states, and error shapes.

### 4) Identify brittle or inconsistent integration points

Flag seams that rely on undocumented assumptions, duplicated mapping logic, or manual synchronization across layers.

### 5) Propose cohesion fixes

Recommend changes that make the integration sturdier: shared types, adapter cleanup, dependency pruning, contract tests, or clearer ownership.

## Output Contract

1. **Dependency and Integration Snapshot**
2. **Contract Mismatches or Risky Dependencies**
3. **Cohesion Plan**
4. **Immediate vs Deferred Fixes**
5. **Next Step**

## Guardrails

- Do not recommend upgrades solely because a newer version exists.
- Do not treat generated code drift as a dependency issue without checking the source contract.
- Do not collapse distinct integration concerns into one vague "refactor."
- Do not ignore migration cost when suggesting dependency changes.
