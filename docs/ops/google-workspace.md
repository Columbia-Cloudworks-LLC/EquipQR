# Google Workspace (operator / agent)

Maintainer contract for EquipQR Connect. Customer steps live in
[Connect Google Workspace](../support/admin-integrations/google-workspace-connect.md).
Secrets and vault items: [agent-secrets-and-access.md](./agent-secrets-and-access.md).
GCP Console IAM: [cloud-admin-access.md](./cloud-admin-access.md).

## OAuth request

Connect must request `openid`, `email`, and `profile` plus directory scopes.
Callback errors validate via `validate_google_workspace_oauth_session`.
URL handlers clear `gw_connected` on `gw_error`.

**Directory sync** on Integrations must not require Drive/Docs/Sheets export
scopes. Gate that path on `admin.directory.user.readonly` only so
directory-only connections stay usable. Incremental consent for export
scopes is documented in [deployment.md](./deployment.md) (Google Workspace
Scope Matrix).

## Access contract

- Claimed domains block self-join.
- Membership needs import or invite.
- Directory sync revokes suspended or removed users.
- Connect and disconnect require org owner or admin.
- Disconnect clears OAuth, cached directory data, and the domain claim.

Use the Columbia Cloudworks Workspace tenant and Google account for GCP
Console OAuth edits on `equipqr-prod`. Validate integration with the real
EquipQR Connect flow. Do not provision parallel Google orgs unless the
maintainer explicitly asks.

When blocked on Google Admin or GCP Console UI, load `Google (Business)`
via `bash dev/e2e/env.sh google-business` before asking the maintainer
to sign in manually.

## Redirect URIs

Local uses **separate** GCP clients for Supabase Auth sign-in vs Google
Workspace Connect. Register `http://localhost:54321` and
`http://127.0.0.1:54321` on each. Set
`GW_OAUTH_REDIRECT_BASE_URL=http://localhost:54321` in
`supabase/functions/.env`, then restart with `bash dev/linux/dev.sh stop` /
`bash dev/linux/dev.sh start`.

Production callbacks use `https://supabase.equipqr.app` (Google console
and Vercel `VITE_SUPABASE_URL`). Keep
`GW_OAUTH_REDIRECT_BASE_URL=https://supabase.equipqr.app` on
`edge-env-prod-secrets` and sync with
`bash dev/ops/supabase-secrets.sh -OpItem edge-env-prod-secrets`.

A derived-URL cleanup is tracked in
[url-config-external-cleanup.md](./url-config-external-cleanup.md).
Do not drop the local or production `GW_OAUTH_REDIRECT_BASE_URL` values
until that cutover is live.

## Verification Center and email

Google OAuth Verification Center expects a live
[equipqr.app/privacy-policy](https://equipqr.app/privacy-policy) page
(not `/privacy`). `@equipqr.app` does not forward email.

## Preview client-ID drift

App (`app-env-preview-public` / `GOOGLE_WORKSPACE_CLIENT_ID`) and edge
(`edge-env-prod-secrets`) must match. Check and rotate via
[agent-secrets-and-access.md](./agent-secrets-and-access.md).
