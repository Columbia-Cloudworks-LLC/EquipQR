# URL Config External Cleanup Checklist

After the URL simplification code ships, clean up environment secrets and vendor consoles so stale OAuth redirect knobs cannot be reintroduced by sync scripts.

## Canonical inputs per environment

| Concept | Browser (Vercel) | Edge Functions (Supabase) |
|---------|------------------|---------------------------|
| Supabase / API base | `VITE_SUPABASE_URL` | `SUPABASE_URL` (auto-injected) |
| Public app origin | n/a (browser uses `window.location.origin` at runtime) | `PUBLIC_SITE_URL` |

OAuth callback URIs are **derived** from the Supabase base URL. Do **not** set separate QuickBooks or Google Workspace OAuth redirect base variables for normal environments.

## Derived vendor callback URIs

Register these exact URIs in Intuit and Google Cloud consoles:

| Environment | QuickBooks callback | Google Workspace callback |
|-------------|---------------------|---------------------------|
| Local | `http://localhost:54321/functions/v1/quickbooks-oauth-callback` | `http://localhost:54321/functions/v1/google-workspace-oauth-callback` |
| Preview (cloud) | `https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback` | `https://supabase.equipqr.app/functions/v1/google-workspace-oauth-callback` |
| Production | `https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback` | `https://supabase.equipqr.app/functions/v1/google-workspace-oauth-callback` |

## Vercel (preview + production)

1. Confirm `VITE_SUPABASE_URL` matches the target Supabase project URL.
2. **Remove** if present:
   - `VITE_QB_OAUTH_REDIRECT_BASE_URL`
   - `VITE_GW_OAUTH_REDIRECT_BASE_URL`
3. No replacement Vercel public vars are required for OAuth callbacks.

## Supabase Edge secrets (preview + production branches)

1. Set `PUBLIC_SITE_URL`:
   - Preview: `https://preview.equipqr.app`
   - Production: `https://equipqr.app`
2. **Remove** if present:
   - `QB_OAUTH_REDIRECT_BASE_URL`
   - `GW_OAUTH_REDIRECT_BASE_URL`
3. Keep `PRODUCTION_URL` only while older deploys still read it; migrate to `PUBLIC_SITE_URL` and delete `PRODUCTION_URL` after validation.

Sync helper (read-only check first):

```powershell
.\scripts\sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-preview-secrets
.\scripts\sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-prod-secrets
```

## 1Password source-of-truth items

Update EquipQR Agents vault items so future syncs do not restore retired knobs:

| Item | Action |
|------|--------|
| `app-env-preview-public` / `app-env-prod-public` | Remove `VITE_QB_OAUTH_REDIRECT_BASE_URL`, `VITE_GW_OAUTH_REDIRECT_BASE_URL` fields |
| `edge-env-preview-secrets` / `edge-env-prod-secrets` | Add `PUBLIC_SITE_URL`; remove `QB_OAUTH_REDIRECT_BASE_URL`, `GW_OAUTH_REDIRECT_BASE_URL`; keep `PRODUCTION_URL` only until migration complete |

Re-run:

```powershell
.\scripts\sync-vercel-from-1password.ps1
.\scripts\sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-preview-secrets
```

## Intuit Developer Portal

1. Open the EquipQR app → **Keys & OAuth**.
2. Ensure redirect URIs include the derived preview and production callback URLs above.
3. Remove any redirect URI using the retired host `supabase.preview.equipqr.app`.

## Google Cloud Console

1. Open the shared OAuth web client used by EquipQR.
2. Under **Authorized redirect URIs**, ensure the derived preview and production Google Workspace callback URLs above are listed.
3. Remove any redirect URI using `supabase.preview.equipqr.app`.

## Validation

1. Deploy to `preview` and wait for `preview.equipqr.app` to serve the new build.
2. Sign in and open `/dashboard/organization/integrations`.
3. Verify Google Workspace remains connected.
4. Attempt QuickBooks **Connect** and confirm `quickbooks_credentials` metadata is stored.
5. Optional: run the opt-in Playwright real-auth preflight (`docs/ops/playwright-real-auth-integrations.md`).

## Rollback

If OAuth fails after cleanup, temporarily restore matching `QB_OAUTH_REDIRECT_BASE_URL` / `VITE_QB_OAUTH_REDIRECT_BASE_URL` values to the **same** derived Supabase URL — not the retired preview custom hostname. The code still normalizes the retired host for legacy deploys.
