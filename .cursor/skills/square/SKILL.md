---
name: square
description: Use when checking scoped code against established architectural patterns, folder structure, naming conventions, dependency direction, or repository design rules.
---

# Square

## Symbolism

The square reminds the builder to bring every action into right alignment.

## Purpose

Audit the scoped files against the repository's architectural patterns and identify where the work is out of square with the project's structure, naming, or design logic.

This skill should surface drift and propose a practical plan to bring the code back into alignment without rewriting more than necessary.

## Invocation

- `/square`
- `/square <optional-scope-path>`

## Operating Rules

1. Derive the repository's current patterns before judging deviations.
2. Distinguish intentional exceptions from accidental drift.
3. Check structure, naming, dependency direction, and responsibility boundaries together.
4. Prefer minimal alignment plans over broad redesign.
5. Explain why a deviation matters to maintainability, correctness, or clarity.

## Workflow

Copy this checklist and track it while running:

```markdown
Square Progress
- [ ] 1) Confirm scope and baseline patterns
- [ ] 2) Inspect folder structure, naming, and dependencies
- [ ] 3) Identify code that is out of square
- [ ] 4) Propose an alignment plan
- [ ] 5) Separate immediate fixes from larger structural work
```

### 1) Confirm scope and baseline patterns

Read nearby code, docs, and conventions to determine the project's actual architectural rules in the target area.

### 2) Inspect folder structure, naming, and dependencies

Check whether the scoped files fit the expected layering, naming, and responsibility boundaries.

### 3) Identify code that is out of square

Flag issues such as:

- modules in the wrong layer or directory
- naming that conflicts with established conventions
- responsibilities mixed into one file or component
- dependency flow that cuts across intended boundaries

### 4) Propose an alignment plan

For each finding, specify the smallest change that would bring it back into alignment and the reason the change is worth doing.

### 5) Separate immediate fixes from larger structural work

Distinguish between quick corrections and deeper refactors that need explicit approval or scheduling.

## Output Contract

1. **Pattern Baseline**
2. **Out-of-Square Findings**
3. **Alignment Plan**
4. **Immediate vs Deferred Work**
5. **Next Step**

## Guardrails

- Do not invent architecture rules that the repository does not actually follow.
- Do not use this skill as cover for unrelated refactoring.
- Do not treat isolated naming differences as major structural drift unless they cause real confusion.
- Do not recommend moving files or layers without explaining the concrete benefit.
