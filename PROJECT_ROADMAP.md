# EquipQR Project Roadmap

Last updated: 2026-03-30

This roadmap is grounded in current repository evidence and active GitHub issues.
It avoids assumptions about proprietary sensors, paid integrations, or contracts we do not already have.

## Current Snapshot

- Branch health: `preview` is clean and synced.
- Open issues: 13 original + 3 newly added roadmap issues.
- Open PRs: 1 (`dependabot` dependency bump).
- Delivery trend in repo: strong compliance/privacy work, UI polish, and Google Workspace baseline integrations.

## In Progress

- `#496` Compliance self-audit umbrella (SOC2/PCI) - partially complete, still active.
- `#501` PII review and data minimization decisions - partially complete, still active.
- `#536` Offline queue feature - implementation largely present; rollout/GA still pending.

## Next (High Value, Realistic)

- `#558` Upgrade to Node.js 24 + toolchain alignment.
- `#534` Lost & Found public QR landing MVP (currently unauthenticated users are sent to auth flow).
- `#588` DSR cockpit GA and operator workflow (new).
- `#589` Replace synthetic dashboard trends with real historical data (new).

## Planned (Near-Mid Term)

- `#532` Tool check-in/check-out tracking.
- `#533` Inventory kitting/service packs.
- `#535` Depreciation + end-of-life calculator.
- `#590` Work order templates and quick-clone drafts (new).

## Strategic / Longer Horizon

- `#553` PM schedule sync to Google Calendar.
- `#554` Google Drive folder organization for equipment documents.
- `#555` Inventory valuation export to Google Sheets.
- `#556` Google Docs printable work order generation.
- `#557` Email-to-work-order ingestion (MVP path should prefer low-cost App Script webhook before Pub/Sub complexity).

## Tracking Notes

- Several open issues were missing labels and were normalized with `enhancement` labels where appropriate.
- Reconciliation comments were added to:
  - `#496` (umbrella status stale vs delivered controls),
  - `#501` (privacy controls delivered vs remaining decision surface),
  - `#536` (implemented core vs GA remaining work).
- No open issues were closed in this pass because none are fully complete end-to-end.

## Suggested Operating Cadence

1. Keep at most 2 active implementation issues as true `In-Progress`.
2. Tie each merged PR to an issue with `Fixes #...` where possible.
3. Update this file weekly after triage so "what's next" stays explicit.
