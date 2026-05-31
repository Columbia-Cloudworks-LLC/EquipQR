---
name: itil-service-request
description: Lightweight feasibility and scope workflow for one EquipQR feature, enhancement, integration, or vendor-cost request. Use when the user asks whether to build something, what it would cost in dollars, or how to scope a non-bug issue before implementation.
---

# ITIL Service Request

## Purpose

Evaluate one non-bug request quickly enough to decide whether to build it. This replaces the old long-form Service Request artifact with a concise scope, cost, dependency, and recommendation summary.

## Inputs

Accept exactly one of:

- A GitHub issue number or URL.
- A single feature/enhancement request.
- A vendor/integration idea to evaluate.

If the request is actually broken behavior, use `itil-problem-record` instead.

## Workflow

### 1. Read The Request

For GitHub issues:

```powershell
gh issue view <number> --json number,title,body,labels,state,comments,url
```

Identify:

- User persona and workflow.
- Requested outcome.
- Constraints or acceptance criteria.
- Named vendors, APIs, or setup steps.

### 2. Map Existing Product Surface

Use direct repo tools for narrow searches. Use the `explore` subagent when the request spans multiple features.

Capture:

- Existing routes, components, services, hooks, tables, migrations, edge functions, or support content.
- Whether this extends an existing pattern or creates a new product surface.
- Permission, organization-scope, RLS, or data-retention implications.

### 3. Research External Dependencies

Use `docs-researcher` for current documentation, setup steps, pricing pages, SDK/API behavior, and vendor caveats.

Only research what the request actually needs:

- If no external dependency is required, write `$0 - no new third-party service`.
- If a vendor cost exists, cite the current source and describe dollars only. Do not estimate hours, sprints, or effort.
- If pricing or setup is login-gated or "Contact Sales", say so instead of guessing.

### 4. Produce The Service Summary

Use this compact format:

```markdown
## Service Summary

- **Issue/request:** #<number> - <title>
- **Request type:** <feature | enhancement | integration | vendor-cost | chore>
- **Recommended decision:** <build | build with conditions | return to reporter | decline>
- **Scope:** <in-scope surfaces and explicit out-of-scope boundaries>
- **External dependencies:** <vendors, APIs, SDKs, or "None">
- **Potential cost:** <dollars, cadence, confidence, source URL if applicable>
- **Setup needed:** <credential, dashboard, plan, webhook, or "None">
- **Risks:** <permissions, RLS, data model, UX, operations, vendor lock-in>
- **Suggested implementation path:** <short, concrete direction>
- **Next step:** <implement with `itil-issue-resolver` | draft a formal plan | clarify with reporter>
```

### 5. Handoff

- If the request is small and clear, hand directly to `itil-issue-resolver` after user approval.
- If implementation needs a written plan, use `itil-change-record` in its simplified form.
- If vendor setup must happen first, state the setup owner and verification step before code begins.

## Guardrails

- Keep costs in dollars only. No engineering-hour estimates.
- Do not fabricate vendor pricing, setup steps, or product capabilities.
- Prefer existing EquipQR patterns and vendors over adding a new service.
- Do not modify code from this skill.
- Do not require a Change Record unless the user asks for one or the scope needs a formal plan.
