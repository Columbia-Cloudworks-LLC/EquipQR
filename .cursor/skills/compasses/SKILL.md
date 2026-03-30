---
name: compasses
description: Use when reviewing authorization boundaries, rate limiting, tenant isolation, IAM scope, or runtime guardrails that keep the application within its intended bounds.
---

# Compasses

## Symbolism

The compasses circumscribe the work and keep it within due bounds.

## Purpose

Analyze the application's boundaries and guardrails so it cannot stray into unauthorized data access, runaway execution, or over-broad privilege.

This skill is about enforcing limits at the seams: APIs, roles, rate limits, function boundaries, data scope, and operational controls.

## Invocation

- `/compasses`
- `/compasses <optional-scope-path>`

## Operating Rules

1. Focus on boundary enforcement, not general code quality.
2. Review identity, authorization, tenant scope, and rate or execution limits together.
3. Prefer fail-closed defaults and least privilege.
4. Check each trust boundary hop, not just the first entry point.
5. Treat missing guards on destructive or high-cost paths as high-risk.

## Workflow

Copy this checklist and track it while running:

```markdown
Compasses Progress
- [ ] 1) Confirm scope and trust boundaries
- [ ] 2) Map entry points, privileges, and data reach
- [ ] 3) Check rate limits, authorization guards, and execution bounds
- [ ] 4) Identify places the app can stray beyond scope
- [ ] 5) Produce a guardrail plan
```

### 1) Confirm scope and trust boundaries

Identify the relevant APIs, background jobs, edge functions, UI actions, or automation paths and the trust boundaries between them.

### 2) Map entry points, privileges, and data reach

Document who can call what, what permissions are required, and what data or side effects each path can reach.

### 3) Check rate limits, authorization guards, and execution bounds

Look for:

- missing or weak rate limiting
- over-broad IAM or service role usage
- missing role or tenant checks
- background tasks without execution limits or circuit breakers

### 4) Identify places the app can stray beyond scope

Flag every path where a caller could access more data, trigger more work, or hold more power than intended.

### 5) Produce a guardrail plan

Recommend the smallest set of controls needed to keep the system within bounds.

## Output Contract

1. **Boundary Map**
2. **Out-of-Bounds Findings**
3. **Guardrail Plan**
4. **Priority Order**
5. **Next Step**

## Guardrails

- Do not assume upstream checks make downstream guards unnecessary.
- Do not conflate admin convenience with least privilege.
- Do not ignore tenant isolation on shared tables or APIs.
- Do not recommend adding limits without explaining the abuse or failure mode they prevent.
