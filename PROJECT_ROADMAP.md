# EquipQR Project Roadmap

Last updated: 2026-04-30

This roadmap is grounded in current repository evidence and active GitHub issues.
It avoids assumptions about proprietary sensors, paid integrations, or contracts we do not already have.

## Current Snapshot

- Version: **3.1.0** on `main`; `preview` is clean and at HEAD.
- Open issues: ~48 across enhancement, bug, compliance, and Google Workspace tracks.
- Open PRs: 1 (`#705 Source file unit tests`, all CI checks green, targeting `preview`).
- Delivery trend since last roadmap update: Mission Control UI overhaul, animated GSAP landing hero,
  real dashboard trends, bulk equipment edit grid, QR scan quick actions, auth-claims performance refactor,
  Supabase migration validator CI, DSR cockpit GA work, and a major round of feature-flag cleanup.

## Completed (shipped since last roadmap update)

- `#589` Replace synthetic dashboard trends with real historical data — shipped in v3.0.0 (PR #656).
- `#627` Bulk equipment data grid (inline list editing) — shipped in v3.0.0 (PR #648).
- `#630` Epic: Mission Control UI overhaul (tokens #631, dense tables #633, nav #634, accessibility #635,
  audit log explorer #641) — shipped in v3.0.0 (PR #662).
- `#660` Animated landing hero (GSAP QR → state morph → PM checklist) — shipped in v3.0.0 (PR #661).
- `#671` P1 black screen on landing (auth retry loop blocking render) — fixed in v3.0.1 (PR #673).
- `#686` Replace `supabase.auth.getUser()` with `getClaims()` across service/hook files — shipped in
  PR #687 (merged 2026-04-26); no remaining `.auth.getUser()` calls in `src/`.
- `#695` Permission-aware quick actions on equipment QR scan page — shipped in v3.1.0 (PR #701).

## In Progress

- `#496` Compliance self-audit umbrella (SOC 2 / PCI) — partially complete, still active.
- `#501` PII review and data minimization — partially complete, still active.
- `#536` Full offline mode & sync (local-first architecture) — core queue implemented;
  GA, conflict resolution, and full offline identity path still pending.
  Note: `#686` (getClaims refactor) was a prerequisite and is now done.

## Next (High Value, Realistic)

- `#650` Expand `canCreateEquipment()` to team managers and technicians — narrow RBAC fix,
  documented inconsistency between code/docs/RLS, no vendor dependency.
- `#588` DSR cockpit GA and operator workflow — cockpit route and components exist;
  remaining work: remove feature-flag gate, SLA-focused defaults, evidence export, runbook section.
- `#558` Upgrade to Node.js 24 LTS and toolchain alignment — `package.json` already allows
  `>=22.9.0` and Vite is at 6.4.2; remaining: pin Node 24 in `.nvmrc`/CI, align Vitest to 4.x.

## Planned (Near-Mid Term)

- `#682` Add Playwright E2E testing with mocked Google OAuth — Service Request posted 2026-04-24,
  awaiting Change Record authorization.
- `#532` Tool check-in/check-out tracking.
- `#533` Inventory kitting/service packs.
- `#534` Lost & Found public QR landing MVP (unauthenticated users still reach auth flow).
- `#535` Depreciation + end-of-life calculator.
- `#590` Work order templates and quick-clone drafts.
- `#628` Bulk inventory data grid (inline list editing) — sibling of the shipped #627.

## Strategic / Longer Horizon

- `#553` PM schedule sync to Google Calendar.
- `#554` Google Drive folder organization for equipment documents.
- `#555` Inventory valuation export to Google Sheets.
- `#556` Google Docs printable work order generation.
- `#557` Email-to-work-order ingestion (App Script webhook preferred over Pub/Sub for MVP).
- `#600` QBO invoice payload formatting (CJ template parity) — milestone #14 active.

## Open Items Needing Triage

- `#675` Avoid eager GSAP landing chunk download when authenticated — distinct from the #671 black-screen
  fix; still open, performance optimization, low urgency given the lazy-load guards already in place.
- `#665` Dashboard overdue sparkline excludes historically-overdue completed WOs — bug, still open.
- `#663` Invitation links fall back to production URL when `PRODUCTION_URL` secret unset — bug, open.
- `#647` User time zone not respected across the application — bug, open.
- `#601` 405 when connecting to Google Workspace — user-reported bug, still open.

## Tracking Notes

- Reconciliation pass executed 2026-04-30:
  - Closed `#695` (QR quick actions shipped v3.1.0).
  - Closed `#686` (getClaims refactor shipped PR #687).
  - Added labels to `#685` (maintenance) and `#691` (User Persona).
  - Updated project board statuses for `#695` and `#686` to Completed.
- `PROJECT_ROADMAP.md` had not been updated since 2026-03-30; now reflects v3.0.0, v3.0.1, and v3.1.0
  delivery.

## Suggested Operating Cadence

1. Keep at most 2 active implementation issues as true `In-Progress`.
2. Tie each merged PR to an issue with `Fixes #...` where possible.
3. Update this file after each trestle pass or release.
