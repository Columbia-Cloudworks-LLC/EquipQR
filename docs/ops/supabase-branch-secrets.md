# Supabase Branch Secrets Configuration

This guide documents the Edge Function secrets that must be configured for each Supabase branch (production and preview/staging).

## Overview

Supabase Edge Functions use environment variables (secrets) that are **branch-specific**. This means:
- Secrets set for the production branch are **not** available in the preview branch
- Secrets set for the preview branch are **not** available in the production branch
- You must configure secrets separately for each branch that uses Edge Functions

## Where to Configure Secrets

Secrets are configured in the Supabase Dashboard:

1. Navigate to your Supabase project
2. Switch to the branch you want to configure (using the branch dropdown in the top navigation)
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Add or update secrets for that specific branch

## Required Secrets for Preview Branch

The preview branch (`olsdirkvvfegvclbpgrg`) requires the following secrets to be configured:

### Core Supabase Configuration

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `SUPABASE_URL` | All Edge Functions | `https://olsdirkvvfegvclbpgrg.supabase.co` | **Must be the preview branch URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | Most Edge Functions | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Service role key for preview branch |
| `SUPABASE_ANON_KEY` | Some Edge Functions | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Anon key for preview branch |

### Application Configuration

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `PRODUCTION_URL` | `send-invitation-email`, `quickbooks-oauth-callback` | `https://preview.equipqr.app` | **For preview branch, this should be the preview deployment URL** |
| `SUPER_ADMIN_ORG_ID` | Admin validation functions | `your-org-id` | Organization ID for super admin access |

### Email Service

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `RESEND_API_KEY` | `send-invitation-email` | `re_...` | Resend API key for sending invitation emails |

### Authentication & Security

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `HCAPTCHA_SECRET_KEY` | `verify-hcaptcha` | `0x...` | hCaptcha secret key for server-side verification |

### Encryption & Cryptography

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `TOKEN_ENCRYPTION_KEY` | Google Workspace OAuth functions | Base64 string | **Required.** Encrypts OAuth refresh tokens at rest. Generate with: `openssl rand -base64 32` |
| `KDF_SALT` | Google Workspace OAuth functions | Base64 string | **Optional but recommended.** Deployment-specific salt for PBKDF2 key derivation. Provides defense-in-depth. Generate with: `openssl rand -base64 32`. ⚠️ **Do not change during normal operations.** If rotation is required (e.g., suspected compromise), first deploy a migration that can derive keys with both the old and new salt, re-encrypt all existing tokens with the new parameters, and only then update this secret. Changing `KDF_SALT` without a migration will make existing encrypted tokens unreadable. |

### Google Maps Integration

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `GOOGLE_MAPS_SERVER_KEY` | `geocode-location`, `places-autocomplete` | `AIza...` | Google Maps API key used server-side. Legacy `GOOGLE_MAPS_API_KEY` still accepted as fallback. |
| `GOOGLE_MAPS_BROWSER_KEY` | `public-google-maps-key` | `AIza...` | Google Maps API key exposed to browser (can be same as above). Legacy `VITE_GOOGLE_MAPS_BROWSER_KEY` still accepted as fallback. |
| `GOOGLE_MAPS_MAP_ID` | `public-google-maps-key` | `1a2b3c...` | **Optional.** Cloud-managed Map ID enabling vector basemaps + AdvancedMarkerElement. When absent the Fleet Map falls back to a raster basemap with legacy markers. |

> ⚠️ **The browser key value is only half the configuration.** Even after the secret is provisioned on the Supabase project, Google will reject the key at runtime with `RefererNotAllowedMapError` if the page URL is not in the key's HTTP-referrer allowlist on the upstream **Google Cloud project**. See [Google Maps API key — HTTP referrer allowlist](#google-maps-api-key--http-referrer-allowlist) below.

### QuickBooks Integration

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `INTUIT_CLIENT_ID` | All QuickBooks functions | `Q0...` | QuickBooks OAuth client ID |
| `INTUIT_CLIENT_SECRET` | All QuickBooks functions | `...` | QuickBooks OAuth client secret |
| `QB_OAUTH_REDIRECT_BASE_URL` | `quickbooks-oauth-callback` | `https://supabase.equipqr.app` | **⚠️ CRITICAL: Must match client `VITE_QB_OAUTH_REDIRECT_BASE_URL`** |
| `QUICKBOOKS_SANDBOX` | All QuickBooks functions | `true` or `false` | Set to `true` for sandbox, `false` for production |
| `ENABLE_QB_PDF_ATTACHMENT` | `quickbooks-export-invoice` | `true` or `false` | Enable PDF attachment for invoice exports |

### GitHub Integration (Bug Reporting)

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `GITHUB_PAT` | `create-ticket` | `github_pat_...` | GitHub Personal Access Token (fine-grained) with **Issues: Read and write** permission scoped to `Columbia-Cloudworks-LLC/EquipQR`. Generate at: [GitHub Settings > Fine-grained tokens](https://github.com/settings/tokens?type=beta) |
| `GITHUB_WEBHOOK_SECRET` | `github-issue-webhook` | Random hex string | Shared secret for HMAC-SHA256 webhook signature verification. Must match the secret configured in GitHub repo Settings > Webhooks. Generate with: `openssl rand -hex 32` |

## Edge Functions and Their Required Secrets

### Core Functions

#### `send-invitation-email`
- `RESEND_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `PRODUCTION_URL` ✅

#### `geocode-location`
- `GOOGLE_MAPS_SERVER_KEY` ✅ (legacy `GOOGLE_MAPS_API_KEY` accepted as fallback)
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

#### `public-google-maps-key`
- `GOOGLE_MAPS_BROWSER_KEY` ✅ (legacy `VITE_GOOGLE_MAPS_BROWSER_KEY` accepted as fallback)
- `GOOGLE_MAPS_MAP_ID` ⚠️ (Optional — unlocks vector basemaps + AdvancedMarkerElement)

#### `verify-hcaptcha`
- `HCAPTCHA_SECRET_KEY` ✅

### Admin Functions

#### `list-organizations-admin`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SUPER_ADMIN_ORG_ID` ✅

### QuickBooks Functions

#### `quickbooks-oauth-callback`
- `INTUIT_CLIENT_ID` ✅
- `INTUIT_CLIENT_SECRET` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `PRODUCTION_URL` ✅
- `QB_OAUTH_REDIRECT_BASE_URL` ✅ **⚠️ CRITICAL: Must match `VITE_QB_OAUTH_REDIRECT_BASE_URL`**
- `QUICKBOOKS_SANDBOX` ✅

#### `quickbooks-refresh-tokens`
- `INTUIT_CLIENT_ID` ✅
- `INTUIT_CLIENT_SECRET` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `QUICKBOOKS_SANDBOX` ✅

#### `quickbooks-search-customers`
- `INTUIT_CLIENT_ID` ✅
- `INTUIT_CLIENT_SECRET` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `QUICKBOOKS_SANDBOX` ✅

#### `quickbooks-export-invoice`
- `INTUIT_CLIENT_ID` ✅
- `INTUIT_CLIENT_SECRET` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `QUICKBOOKS_SANDBOX` ✅
- `ENABLE_QB_PDF_ATTACHMENT` ✅

### Bug Reporting

#### `create-ticket`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `GITHUB_PAT` ✅

#### `github-issue-webhook`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `GITHUB_WEBHOOK_SECRET` ✅

### Other Functions

#### `resolve-inventory-scan`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

#### `part-detail`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

#### `import-equipment-csv`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

### Google Workspace Integration Functions

#### `google-workspace-oauth-callback`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `TOKEN_ENCRYPTION_KEY` ✅
- `KDF_SALT` ⚠️ (Optional but recommended for defense-in-depth)
- `GW_OAUTH_REDIRECT_BASE_URL` ✅
- `GOOGLE_WORKSPACE_CLIENT_ID` ✅
- `GOOGLE_WORKSPACE_CLIENT_SECRET` ✅

#### `google-workspace-sync-users`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `TOKEN_ENCRYPTION_KEY` ✅
- `KDF_SALT` ⚠️ (Optional but recommended for defense-in-depth)
- `GOOGLE_WORKSPACE_CLIENT_ID` ✅
- `GOOGLE_WORKSPACE_CLIENT_SECRET` ✅

### Google Picker Configuration (Client-Side, Not Supabase Secrets)

Google Picker values are browser/client configuration and should be stored as client env vars (for example in Vercel and local `.env` files):

- `VITE_GOOGLE_WORKSPACE_CLIENT_ID` (shared OAuth web client used by Workspace callback flow and browser Picker token flow)
- `VITE_GOOGLE_PICKER_API_KEY`
- `VITE_GOOGLE_PICKER_APP_ID` (Google Cloud project number)
- `VITE_GOOGLE_PICKER_CLIENT_ID` is not used and should not be configured.

Do **not** add Picker values to Supabase Edge Function secrets.

## Configuration Steps for Preview Branch

### Step 1: Switch to Preview Branch

1. Open Supabase Dashboard
2. Use the branch dropdown in the top navigation
3. Select the **preview** branch (`olsdirkvvfegvclbpgrg`)

### Step 2: Get Preview Branch Credentials

1. Navigate to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://olsdirkvvfegvclbpgrg.supabase.co`
   - **anon/public key**: Use this for `SUPABASE_ANON_KEY`
   - **service_role key**: Use this for `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Step 3: Configure Secrets

1. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
2. Add each required secret:

```bash
# Core Supabase Configuration
SUPABASE_URL=https://olsdirkvvfegvclbpgrg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<preview-branch-service-role-key>
SUPABASE_ANON_KEY=<preview-branch-anon-key>

# Application Configuration
PRODUCTION_URL=https://preview.equipqr.app
SUPER_ADMIN_ORG_ID=<your-org-id>

# Email Service
RESEND_API_KEY=<your-resend-api-key>

# Authentication
HCAPTCHA_SECRET_KEY=<your-hcaptcha-secret>

# Google Maps
GOOGLE_MAPS_SERVER_KEY=<your-google-maps-api-key>
GOOGLE_MAPS_BROWSER_KEY=<your-google-maps-api-key>
GOOGLE_MAPS_MAP_ID=<optional-google-maps-cloud-map-id>

# GitHub Integration (Bug Reporting)
GITHUB_PAT=<your-github-pat>
GITHUB_WEBHOOK_SECRET=<your-github-webhook-secret>

# QuickBooks (if enabled)
INTUIT_CLIENT_ID=<your-intuit-client-id>
INTUIT_CLIENT_SECRET=<your-intuit-client-secret>
QB_OAUTH_REDIRECT_BASE_URL=https://supabase.preview.equipqr.app
QUICKBOOKS_SANDBOX=true
ENABLE_QB_PDF_ATTACHMENT=false

# Google Workspace Integration (if enabled)
GOOGLE_WORKSPACE_CLIENT_ID=<your-google-workspace-client-id>
GOOGLE_WORKSPACE_CLIENT_SECRET=<your-google-workspace-client-secret>
GW_OAUTH_REDIRECT_BASE_URL=https://supabase.preview.equipqr.app
TOKEN_ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
KDF_SALT=<generate-unique-salt-with-openssl-rand-base64-32>
```

### Step 4: Verify Configuration

After setting secrets, verify they're working:

1. Test an Edge Function that uses the secrets
2. Check function logs in **Edge Functions** → **Logs**
3. Look for any "Missing environment variable" errors

## Important Notes

### ⚠️ Critical: Branch-Specific Values

- **`SUPABASE_URL`**: Must be the preview branch URL (`https://olsdirkvvfegvclbpgrg.supabase.co`), NOT the production URL
- **`PRODUCTION_URL`**: For preview branch, this should be `https://preview.equipqr.app` (the preview deployment URL), NOT `https://equipqr.app`

### 🔄 Secrets Are Not Synced

Secrets are **not automatically synced** between branches. If you add a new secret to production, you must manually add it to the preview branch as well.

### 🔐 Security Best Practices

1. Never commit secrets to version control
2. Use different API keys for preview and production when possible
3. Rotate secrets regularly
4. Use the service role key only in Edge Functions (never expose to client)

## Troubleshooting

### Function Returns "Missing environment variable"

1. Verify you're on the correct branch in Supabase Dashboard
2. Check that the secret is set in **Project Settings** → **Edge Functions** → **Secrets**
3. Ensure the secret name matches exactly (case-sensitive)
4. Redeploy the Edge Function after adding secrets

### Function Uses Wrong Supabase Project

1. Verify `SUPABASE_URL` is set to the correct branch URL
2. Check that `SUPABASE_SERVICE_ROLE_KEY` matches the branch
3. Ensure you're testing on the correct branch

### Email Invitations Use Wrong URL

1. Verify `PRODUCTION_URL` is set correctly for the branch:
   - Production branch: `https://equipqr.app`
   - Preview branch: `https://preview.equipqr.app`

## Google Maps API key — HTTP referrer allowlist

The `GOOGLE_MAPS_BROWSER_KEY` Supabase secret only **delivers** the Google Cloud API key value to the browser. The key itself is then validated by Google's CDN against the **HTTP referrer allowlist** configured on the Google Cloud project — and that allowlist is **not** stored in Supabase, **not** synchronized between Supabase branches, and **not** rotated by `scripts/sync-supabase-secrets-from-1password.ps1`. Whenever a new Vercel domain alias, custom domain, or Supabase preview branch is added, the upstream Google Cloud allowlist must be widened by hand.

### Symptom when missing

In the browser DevTools console:

- `Google Maps JavaScript API error: RefererNotAllowedMapError`
- `Your site URL to be authorized: https://<that-domain>/dashboard/fleet-map`
- Followed by `TypeError: Cannot read properties of undefined (reading 'get')` originating in `marker.js` — the downstream crash that occurs because Google Maps half-initializes before rejecting the key.

In the EquipQR UI: the Fleet Map renders the in-app `MapsAuthFailureCard` diagnostic (after [issue #617 follow-up](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/617)) listing the exact URL to authorize.

### Required allowlist entries

Set the same allowlist on every Google Cloud API key referenced as `GOOGLE_MAPS_BROWSER_KEY` (Production Supabase project AND each branch project):

- `http://localhost:8080/*` (local dev)
- `https://equipqr.app/*` (Production)
- `https://*.equipqr.app/*` (covers `preview.equipqr.app` and any future custom subdomain alias)
- `https://preview.equipqr.app/*` (explicit Preview entry — keep alongside the wildcard for clarity)

### Operator steps

1. Open Google Cloud Console → **APIs & Services** → **Credentials** in the GCP project that owns the API key value of `GOOGLE_MAPS_BROWSER_KEY` for the affected Supabase project.
2. Click the API key name to edit it.
3. Under **Application restrictions** → **HTTP referrers**, ensure all the entries above exist. Add any that are missing.
4. Under **API restrictions**, verify only `Maps JavaScript API`, `Places API`, and `Places API (New)` are enabled.
5. Click **Save**. Propagation typically completes within ~1 minute.
6. Reload the affected URL (e.g. `https://preview.equipqr.app/dashboard/fleet-map`) and confirm the basemap renders without `RefererNotAllowedMapError` in the console.

### Why this lives outside Supabase

The HTTP-referrer restriction is a property of the Google Cloud API key itself, not of the EquipQR application or its Supabase Edge Function secrets. The Supabase secret only carries the key string; Google validates the referrer header on every Maps API request against the allowlist on the key. This means the allowlist:

- Is **shared** across every Supabase project / environment that resolves to the same physical Google Cloud key.
- Cannot be rotated by `scripts/sync-supabase-secrets-from-1password.ps1` (which only touches Supabase secret values).
- Must be re-checked whenever a new domain is brought online (custom domain, Vercel alias, additional preview branch URL).

## Related Documentation

- [Supabase Branching Configuration](https://supabase.com/docs/guides/deployment/branching/configuration)
- [Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Deployment Guide](./deployment.md)
