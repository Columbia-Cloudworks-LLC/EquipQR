# Operator Daily Check-Ins

Organization owners and administrators can configure **Daily Check-Ins** under **Operations → Daily Check-Ins** in the dashboard.

## What it does

- Define custom operator safety checklist templates (sections and required items)
- Assign a template on each **equipment details** page (Daily Operator Check-In section)
- Define captured data fields per template: operator-entered values, optional client context (timestamp, timezone, GPS), and curated equipment record snapshots — each with checklist-specific labels
- Open **QR Code** on the equipment record to print either the authenticated equipment scan QR or the separate daily check-in QR (dropdown when a template is assigned)
- Generate a **separate public QR code** (token-based, not guessable from equipment ID)
- Let unauthenticated operators scan, complete admin-configured data fields, and finish the checklist
- Review an append-only daily ledger and export CSV or PDF reports for audit documentation

## Compliance wording

EquipQR records support safety and audit documentation. They **do not** certify OSHA, DOT, or other legal/regulatory compliance.

## Location collection

When **scan location collection** is enabled for the organization, GPS is captured only when the template includes a **GPS location** client context field. Submission still succeeds if the operator denies location permission.

## Public route

Operator check-in QR codes open:

`/qr/operator-check-in/{token}`

This is separate from the authenticated equipment QR at `/qr/equipment/{id}`.

## Abuse protection

Public submissions use hCaptcha (when configured) and server-side rate limits via the `operator-check-in` edge function. Submissions are insert-only; authenticated users cannot edit ledger rows through the app.
