# EquipQR Project Roadmap

Last updated: 2026-05-09

This roadmap is grounded in current repository evidence and active GitHub issues.
It avoids assumptions about proprietary sensors, paid integrations, or contracts we do not already have.

## Current Snapshot

- Version: **3.3.0** on `main`; `preview` is staged for the **3.3.1** release.
- Open issues: tracked across enhancement, bug, compliance, and Google Workspace workstreams.
- Open PRs: release promotion from `preview` to `main` pending.
- Delivery trend since last roadmap update: timezone consistency, schema-drift release gates,
  production migration recovery, audit/export fixes, dependency upgrades, and added hook/service coverage.

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
- `#647` User time zone respected across application surfaces — staged for v3.3.0.
- `#724` Equipment list load failure from non-existent `qr_code` select — fixed and staged for v3.3.0.
- `#735` Production schema drift detection and note-creation recovery — fixed and staged for v3.3.0.

## In Progress

- `#496` Compliance self-audit umbrella (SOC 2 / PCI) — partially complete, still active.
- `#501` PII review and data minimization — partially complete, still active.
- `#536` Full offline mode & sync (local-first architecture) — core queue implemented;
  GA, conflict resolution, and full offline identity path still pending.
  Note: `#686` (getClaims refactor) was a prerequisite and is now done.

## Next (High Value, Realistic)

- `#588` DSR cockpit GA and operator workflow — cockpit route and components exist;
  remaining work: remove feature-flag gate, SLA-focused defaults, evidence export, runbook section.
- `#558` Node.js runtime alignment — `package.json` `engines.node` is **24.x** (Vercel-supported); CI and docs use Node **24.x**. `@types/node` may track a newer typings line.

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
