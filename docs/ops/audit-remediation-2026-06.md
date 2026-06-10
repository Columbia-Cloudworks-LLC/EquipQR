# Thermo-Nuclear Audit Remediation — June 2026

**Branch:** `chore/audit-remediation-2026-06`  
**PR target:** `preview` (draft until Phase 9 gates pass)  
**Audit date:** 2026-06-10  
**Source:** Nine parallel thermo-nuclear domain audits (work-orders, equipment, inventory+reports, small features, organization+teams, shared components, pages/routes, cross-cutting layers, Supabase backend).

---

## Overall Verdict: **C**

File-size discipline is good — almost nothing breaches the 1k-line rule, route-level code-splitting is exemplary, and several subtrees (audit explorer, landing hero, dashboard registry, routes layer) are model code. Four systemic failures repeat in every slice: a type gate that checks zero files, query-key anarchy with provably broken invalidations, duplication policy satisfied by suppression headers instead of deletion, and ~4,500+ lines of dead-but-invisible code behind non-exported symbols.

---

## Per-Module Grades

| Module | Grade | Headline |
|---|---|---|
| Cross-cutting (hooks/services/lib/utils) | **D+** | ~1,600 lines of inert/dead infra; two org-state providers reconciling each other |
| Work-orders | **C-** | 6 query-key namespaces, mismatched invalidations, triple-shape `WorkOrder` type |
| Equipment | **C-** | Vacuous tsc gate, 4 colliding `EquipmentFilters` symbols, divergent privacy logic |
| Organization + Teams | **C-** | Two live compile errors; ~1,800-line PM editor in the wrong feature |
| Small features (pm-templates et al.) | **C+** | 4,025-line service that is ~68% dead data; decorative access gate |
| Supabase backend | **C+** | 892-line `_shared` god-module; security-diverged OAuth clones |
| Inventory + Reports | **B-** | Stringly-typed keys; industrial prop-drilling |
| Shared components | **B-** | 5 components writing to Supabase directly; metric-gaming re-export barrel |
| Pages / routes / shell | **B** | Excellent routing; notification dispatch drifted across 3 copies |

---

## Ten Live Defects (Shipping Today)

1. **`npx tsc --noEmit` checks zero files** — root `tsconfig.json` is `"files": []` + references; `tsc -p tsconfig.app.json` aborts on TS5101 under TypeScript 6.
2. **Two compile errors on disk** — `TeamDetails.tsx:80` unimported `ArrowLeft`; `teamService.ts:222` unimported `Database`.
3. **"Warranty Expiring" filter badge ✕ does nothing** — `EquipmentToolbar.tsx:216` passes string `'false'` (truthy).
4. **`PMTemplateView.tsx` access gate is decorative** — no early return; line 149 is `&& null` no-op.
5. **Work-order edit mutations never invalidate detail-view query key** — six key namespaces, none prefix-match `['work-orders','detail',...]`.
6. **QR scan privacy logic diverged** — `equipmentQRPermissions.ts` fails closed; `useEquipmentScanLogger.ts` fails open.
7. **Notification dispatch copies drifted** — inline copy omits `member_removed`; toolbar omits `ownership_transfer_cancelled` and `member_removed`.
8. **Double success toasts** on org member actions (hooks + `UnifiedMembersList` both toast).
9. **QuickBooks export reflects user input into error bodies** — 28 raw `new Response(JSON.stringify(...))` sites bypass sanitization.
10. **Two export rate limiters with opposite semantics** — one fail-closed org-scoped, one fail-open not org-scoped.

---

## Five Systemic Themes

1. **Quality gates are theater** — vacuous tsc, 25+ `fallow-ignore-file` suppressions, Fallow blind to non-exported dead code (~4,500 lines).
2. **Query-key anarchy** — canonical factory layer exists and is ignored/forked in every feature; shipped bug class (PR #712, defect #5).
3. **Service-layer boundary is fiction** — 57 non-service files import Supabase client directly.
4. **Ownership inverted** — PM editor in organization, offline-sync in global services, notifications in work-orders, ~22 feature hooks in global `src/hooks`.
5. **Security-sensitive copy-paste diverged** — OAuth TTL/skew, rate limiters, QR privacy, tenant scoping inconsistencies.

---

## Phase Roadmap (Execution Checklist)

- [ ] **Phase 0:** Branch, this roadmap doc, draft PR to `preview`
- [ ] **Phase 1:** Repair vacuous tsc type gate; fix all revealed type errors
- [ ] **Phase 2:** Dead-code purge (~4,500 lines, zero behavior change)
- [ ] **Phase 3:** Live defect fixes (test-first, one commit per defect)
- [ ] **Phase 4:** Query-key unification per domain with invalidation regression tests
- [ ] **Phase 5:** Dissolve suppressed duplication; remove `fallow-ignore-file` headers
- [ ] **Phase 6:** Boundary re-homing + ESLint enforcement of Supabase-client boundary
- [ ] **Phase 7:** Edge-function hardening (typed errors, OAuth pipeline, logger, rate limiter)
- [ ] **Phase 8:** Server-side atomic equipment cascade delete (migration + pgTAP + client rewrite)
- [ ] **Phase 9:** Final gates (full Vitest, E2E local-full, Fallow health), CHANGELOG, PR ready

---

## Fallow Health Score

| When | Score | Notes |
|---|---|---|
| Baseline (Phase 0) | **77.3** | `tmp/fallow-health-baseline-20260610.json` |
| Final (Phase 9) | _pending capture_ | |

---

## Execution Summaries

_Add phase completion notes here during execution._
