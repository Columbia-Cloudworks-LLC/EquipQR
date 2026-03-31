---
name: gauge
description: Use when auditing an application for latency, inefficient loops, heavy assets, unoptimized queries, excessive rendering, or poor resource allocation.
---

# 24-Inch Gauge

## Symbolism

The 24-inch gauge divides labor and resources wisely.

## Purpose

Audit the codebase for performance and resource inefficiency, then produce a time-management report that ranks the most meaningful optimization opportunities.

This skill focuses on where time, memory, network, storage, or compute are being wasted and how to reclaim them with targeted changes.

## Invocation

- `/gauge`
- `/gauge <optional-scope-path>`

## Operating Rules

1. Prioritize hot paths and user-visible latency over theoretical micro-optimizations.
2. Separate confirmed bottlenecks from suspected ones.
3. Consider algorithmic complexity, rendering cost, network weight, query efficiency, and background work together.
4. Rank findings by impact, confidence, and implementation cost.
5. Include a verification plan for every proposed optimization.

## Workflow

Copy this checklist and track it while running:

```markdown
Gauge Progress
- [ ] 1) Confirm target surface and runtime context
- [ ] 2) Identify expensive loops, queries, assets, and render paths
- [ ] 3) Estimate impact, confidence, and likely root cause
- [ ] 4) Produce a ranked time-management report
- [ ] 5) Define optimization and verification steps
```

### 1) Confirm target surface and runtime context

Capture whether the concern is frontend, backend, database, build-time, or end-to-end, and note the most important user flow or system path.

### 2) Identify expensive loops, queries, assets, and render paths

Look for:

- `O(n^2)` or repeated traversal patterns
- large bundles or heavy static assets
- repeated renders or expensive selectors
- high-latency API or database operations
- duplicated work that can be cached, batched, or deferred

### 3) Estimate impact, confidence, and likely root cause

For each issue, record:

- what is likely slow or wasteful
- why it matters
- confidence level
- likely user or system impact

### 4) Produce a ranked time-management report

Group findings into a concise report such as:

- `Critical bottlenecks`
- `High-value optimizations`
- `Watchlist / measure first`

### 5) Define optimization and verification steps

For every recommendation, say how to prove the optimization worked: profiling, benchmark, trace, query timing, bundle diff, or UX timing.

## Output Contract

1. **Performance Snapshot**
2. **Ranked Findings** (impact + confidence)
3. **Optimization Plan**
4. **Verification Plan**
5. **Next Step**

## Guardrails

- Do not claim performance problems without evidence or a clearly stated hypothesis.
- Do not recommend complexity-reducing changes that add more system complexity than they save.
- Do not optimize cold paths before hot paths.
- Do not ignore database and network costs while focusing only on local code structure.
