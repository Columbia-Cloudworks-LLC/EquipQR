---
name: chisel
description: Use when polishing existing code for readability, type safety, naming clarity, simpler control flow, or clean-code refinement without deleting behavior or pruning documentation.
---

# Chisel

## Symbolism

The chisel gives shape, precision, and finish to work that already exists.

## Purpose

Perform a standalone craftsmanship pass on selected code to improve clarity, correctness margins, and maintainability.

Unlike `common-gavel`, this skill does not remove confirmed dead code as its main job and does not act as a doc-pruning workflow. It refines what remains.

## Invocation

- `/chisel`
- `/chisel <optional-scope-path>`

## Operating Rules

1. Preserve behavior unless the user explicitly requests a behavior change.
2. Prefer small, high-signal refinements over broad rewrites.
3. Tighten types, naming, and control flow before reaching for abstraction.
4. Explain why each polish step improves readability or reliability.
5. Leave the code easier to understand than it was found.

## Workflow

Copy this checklist and track it while running:

```markdown
Chisel Progress
- [ ] 1) Confirm scope and non-goals
- [ ] 2) Inspect types, naming, and logic complexity
- [ ] 3) Identify low-risk craftsmanship improvements
- [ ] 4) Apply focused polish
- [ ] 5) Verify behavior remains intact
```

### 1) Confirm scope and non-goals

Define what files or symbols are in scope and whether the pass is limited to readability, type tightening, or structural cleanup.

### 2) Inspect types, naming, and logic complexity

Look for:

- weak or implicit typing
- misleading variable or function names
- nested or repetitive boolean logic
- extractable helpers that clarify intent

### 3) Identify low-risk craftsmanship improvements

Choose the refinements that improve the code most without turning the task into an architectural rewrite.

### 4) Apply focused polish

Common polish targets:

- stronger TypeScript types
- simpler conditionals
- clearer names
- smaller, better-bounded helpers
- reduced duplication

### 5) Verify behavior remains intact

Run focused checks appropriate to the scope so the polish pass stays trustworthy.

## Output Contract

1. **Craftsmanship Findings**
2. **Polish Actions**
3. **Behavior-Safety Check**
4. **Optional Further Refinements**
5. **Next Step**

## Guardrails

- Do not delete logic as the primary action; use `common-gavel` for confirmed cleanup.
- Do not rewrite architecture unless the user asks for it.
- Do not add abstractions that make the code harder to follow.
- Do not claim a polish pass is complete without verifying the touched scope.
