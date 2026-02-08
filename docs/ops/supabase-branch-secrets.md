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
| `SUPABASE_ANON_KEY` | Some Edge Functions | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Anon key for preview branch (used by `create-checkout`) |

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
| `GOOGLE_MAPS_API_KEY` | `geocode-location` | `AIza...` | Google Maps API key for geocoding |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | `public-google-maps-key` | `AIza...` | Google Maps API key exposed to browser (can be same as above) |

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

### Stripe Integration (Deprecated - Kept for Rollback)

| Secret Name | Required For | Example Value | Notes |
|------------|--------------|---------------|-------|
| `STRIPE_SECRET_KEY` | `purchase-user-licenses`, `customer-portal`, `check-subscription`, `stripe-license-webhook` | `sk_...` | Stripe secret key (deprecated but kept for compatibility) |
| `STRIPE_WEBHOOK_SECRET` | `stripe-license-webhook` | `whsec_...` | Stripe webhook secret (deprecated but kept for compatibility) |

## Edge Functions and Their Required Secrets

### Core Functions

#### `send-invitation-email`
- `RESEND_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `PRODUCTION_URL` ✅

#### `geocode-location`
- `GOOGLE_MAPS_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

#### `public-google-maps-key`
- `VITE_GOOGLE_MAPS_BROWSER_KEY` ✅

#### `verify-hcaptcha`
- `HCAPTCHA_SECRET_KEY` ✅

### Admin Functions

#### `list-organizations-admin`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SUPER_ADMIN_ORG_ID` ✅

#### `manage-billing-exemptions`
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

#### `create-checkout` (Stripe - Deprecated)
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `STRIPE_SECRET_KEY` ✅

#### `purchase-user-licenses` (Stripe - Deprecated)
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `STRIPE_SECRET_KEY` ✅

#### `customer-portal` (Stripe - Deprecated)
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `STRIPE_SECRET_KEY` ✅

#### `check-subscription` (Stripe - Deprecated)
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `STRIPE_SECRET_KEY` ✅

#### `stripe-license-webhook` (Stripe - Deprecated)
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅

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
- `GOOGLE_OAUTH_CLIENT_ID` ✅
- `GOOGLE_OAUTH_CLIENT_SECRET` ✅

#### `google-workspace-sync-users`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `TOKEN_ENCRYPTION_KEY` ✅
- `KDF_SALT` ⚠️ (Optional but recommended for defense-in-depth)
- `GOOGLE_OAUTH_CLIENT_ID` ✅
- `GOOGLE_OAUTH_CLIENT_SECRET` ✅

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
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
VITE_GOOGLE_MAPS_BROWSER_KEY=<your-google-maps-api-key>

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
GOOGLE_OAUTH_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-google-oauth-client-secret>
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

## Related Documentation

- [Supabase Branching Configuration](https://supabase.com/docs/guides/deployment/branching/configuration)
- [Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Deployment Guide](./deployment.md)
