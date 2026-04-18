# Sources

## In Scope (Production Only)

- `https://equipqr.app`
- canonical production redirects that resolve to the same application
- production Supabase resources (approved read-only access)
- production Vercel resources (approved read-only access)

## Out of Scope

- preview deployments
- local development environments
- staging/testing environments
- unpublished or in-progress features
- roadmap/speculative behavior

## Source Lock Statement

Emit this before evidence collection:

> Source Lock: This run is restricted to production evidence from `https://equipqr.app`, production Supabase, and production Vercel. Preview, staging, local, unpublished, and speculative features are excluded.

## Provenance Requirements

For each artifact, record:

- control/question mapping
- source system
- UTC timestamp when available
- production confirmation
- reproducibility marker
- observation summary

## Reproducibility Markers

Use strongest safe identifiers available:

- app path or route on `https://equipqr.app`
- Vercel production deployment or project identifier
- Supabase production project identifier, schema reference, or export timestamp

## Read-Only Expectation

Evidence collection is read-only by default.

Do not perform destructive production mutations for evidence generation.

## Browser and CLI Account Alignment

The Cursor IDE browser and the `gws` CLI authenticate to Google as different identities. When collecting browser evidence from `https://equipqr.app` and writing deliverables via `gws`:

- Do not rely on the browser to verify `gws`-created Google Docs — use `gws docs documents get` instead.
- If browser-based document verification is needed, share the document to the browser account first via `gws drive permissions create`.
- Before navigating to production app pages, check codebase route definitions (`src/App.tsx` or router config) to confirm the correct paths. Common evidence routes: `/privacy-policy`, `/privacy-request`, `/dashboard/audit-log`, `/terms-of-service`.

## Conflict Handling

If production surfaces disagree:

- capture both observations
- keep provenance for both
- classify using strongest directly relevant evidence
- include conflict note in findings
