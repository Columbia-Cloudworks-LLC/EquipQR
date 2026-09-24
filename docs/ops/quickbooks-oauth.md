# QuickBooks OAuth and environment

Maintainer reference for Intuit OAuth, vault secrets, and local or preview sandbox wiring. Customer steps live in the Help Center [Connect QuickBooks](../support/admin-integrations/connect-quickbooks.md) article.

## Environment configuration

### Client-side environment variables

Add to your `.env` file:

```env
# Intuit OAuth Client ID (public, for initiating OAuth)
VITE_INTUIT_CLIENT_ID=your-client-id
```

### Supabase Edge Function secrets

Configure these secrets in Supabase Dashboard → Edge Functions → Secrets:

| Secret Name | Description |
|-------------|-------------|
| `INTUIT_CLIENT_ID` | Your Intuit app's Client ID |
| `INTUIT_CLIENT_SECRET` | Your Intuit app's Client Secret |
| `PUBLIC_SITE_URL` | Public app origin for OAuth success redirects (`https://equipqr.app` prod, `https://preview.equipqr.app` preview) |
| `QBO_USE_SANDBOX` | Set to `true` on **local dev and preview** so Edge Functions call the sandbox QBO API. Omit on production. |

### Environment matrix (sandbox vs production)

| Tier | App `VITE_INTUIT_CLIENT_ID` | Edge `INTUIT_*` | `QBO_USE_SANDBOX` | QBO companies | Invoice UI |
|------|------------------------------|-----------------|-------------------|---------------|--------------|
| Local | Development | Development | `true` (via `bash dev/ops/local-env.sh`) | Sandbox | `app.sandbox.qbo.intuit.com` |
| Preview | Development | Development | `true` (via secrets sync) | Sandbox | `app.sandbox.qbo.intuit.com` |
| Production | Production | Production | unset | Live | `app.qbo.intuit.com` |

**Why both Development keys and `QBO_USE_SANDBOX`?** Intuit OAuth with Development credentials authorizes **sandbox** companies. The API host flag ensures token refresh and invoice export hit `sandbox-quickbooks.api.intuit.com` instead of the production API (mixing them yields 403s).

After switching preview to sandbox, **disconnect and reconnect** QuickBooks on preview.equipqr.app so stored tokens match the sandbox realm.

Client-side: align the deployed `VITE_INTUIT_CLIENT_ID` with `INTUIT_CLIENT_ID` in `edge-env-preview-secrets` (same Development client ID). The persistent preview uses an isolated Supabase project. Verify live branch-scoped Vercel values before syncing the public vault item; an older vault snapshot may still point at production.

**OAuth redirect URI**

EquipQR derives the QuickBooks OAuth callback from the canonical Supabase URL:

- Browser: `VITE_QB_OAUTH_REDIRECT_BASE_URL` when present, otherwise `VITE_SUPABASE_URL`
- Edge token exchange: `SUPABASE_URL`

Register the derived callback URI in the Intuit Developer Portal:

| Environment | Intuit redirect URI |
|-------------|---------------------|
| Production | `https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback` |
| Preview | `https://<preview-project-ref>.supabase.co/functions/v1/quickbooks-oauth-callback` |
| Local | `http://localhost:54321/functions/v1/quickbooks-oauth-callback` |

For the persistent preview branch, both the Supabase URL and callback must address its isolated backend. The Vercel `preview` environment's `preview` Git branch has an explicit callback override to prevent an inherited retired custom domain from resolving to production. Register that exact callback under Intuit **Development** keys. Never use the retired preview custom hostname as the callback: legacy normalization redirects it to production. Keep production settings separate.

### Vault secrets (token refresh scheduler)

The token refresh scheduler reads secrets from the Supabase Vault. Configure them with the
project secret sync scripts (`bash dev/ops/supabase-secrets.sh` or your
environment's equivalent). Do not paste elevated API keys into tickets, chat, or docs.

Required vault entries (names must match what the scheduler Edge Function expects):

| Secret Name | Description | Where operators load it |
|-------------|-------------|-------------------------|
| Project elevated API key vault entry | Used only by approved Edge Functions for scheduled refresh | Dashboard → Settings → API (secret key); inject via 1Password / sync scripts |
| `supabase_url` | Supabase project URL | Dashboard → Settings → API → Project URL |

Configure separately for each environment (preview, production).

### Setting up Intuit Developer App

1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create a new app or use an existing one
3. Configure OAuth settings:
   - **Redirect URI**: `{your-base-url}/functions/v1/quickbooks-oauth-callback`
     - Default: `https://your-project-ref.supabase.co/functions/v1/quickbooks-oauth-callback`
     - Custom domain: `https://supabase.yourdomain.com/functions/v1/quickbooks-oauth-callback`
     - Local dev: `http://localhost:54321/functions/v1/quickbooks-oauth-callback` (or port from `supabase/config.toml` / `npx supabase status`)
     - Ensure `VITE_SUPABASE_URL` matches the Supabase project that hosts the callback
   - **Scopes**: `com.intuit.quickbooks.accounting`
4. Copy the Client ID and Client Secret

## Invoice line items and Edge Function secrets

Pre-create **Labor** as a **Service** item and **Parts** as a **Non-inventory** item in QuickBooks **Products & services**, or allow EquipQR to auto-create them when missing.

Optional Edge Function secrets (Supabase → Edge Functions → Secrets):

| Secret | Purpose |
|--------|---------|
| `QBO_INVOICE_LABOR_ITEM_NAME` | Display name for the Labor item (default `Labor`) |
| `QBO_INVOICE_PARTS_ITEM_NAME` | Display name for summarized Parts (default `Parts`) |
| `QBO_INVOICE_TRUCK_SUPPLIES_ITEM_NAME` | Legacy name — invoice export no longer emits a separate Truck Supplies line (amounts roll into **Parts**) |
| `QBO_INVOICE_OTHER_ITEM_NAME` | Legacy name — invoice export no longer emits separate **Other** lines |
| `QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID` | Prefer this Income account Id when auto-creating items |
| `QBO_INVOICE_ITEM_INCOME_ACCOUNT_NAME` | Else match this exact active Income account **Name** |
| `QBO_INVOICE_PARTS_ITEM_TYPE` | Ignored except `NonInventory` — unsupported values fall back safely |

**Deprecated:** `QBO_INVOICE_PARTS_ITEM_PREFIX` — invoice export no longer emits one QuickBooks line per part using `Part: <description>`; use summarized **Parts** via `QBO_INVOICE_PARTS_ITEM_NAME` instead.

Item resolution behavior:

1. Query active QuickBooks **Item** by exact **Name** (any type). If found, reuse its Id.
2. If missing, create **Labor** as **Service** and **Parts** as **NonInventory**, using the resolved Income account above or the first active **Income** account.

## Architecture

### Database tables

| Table | Purpose |
|-------|---------|
| `quickbooks_credentials` | Stores OAuth tokens (encrypted) |
| `quickbooks_oauth_sessions` | Temporary OAuth session state |
| `quickbooks_team_customers` | Team-to-customer mappings |
| `quickbooks_export_logs` | Export history and status |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `quickbooks-oauth-callback` | Handles OAuth callback |
| `quickbooks-refresh-tokens` | Background token refresh (called by pg_cron every 15 min) |
| `quickbooks-search-customers` | Customer search API |
| `quickbooks-export-invoice` | Invoice creation/update |

### Scheduled jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `refresh-quickbooks-tokens` | Every 15 minutes | Refreshes access tokens expiring within 15 minutes to prevent connection drops |

### Security

- **Token Storage**: Access and refresh tokens are stored server-side only
- **RLS Policies**: All tables have Row Level Security restricting access to admin/owner roles
- **OAuth State**: CSRF protection via state parameter and session validation
- **Feature Flag**: Integration can be disabled via environment variable

## Troubleshooting

### Connection issues

**"QuickBooks is not configured"**
- Ensure `VITE_INTUIT_CLIENT_ID` is set in your environment
- Verify the Intuit app credentials are correct

**"Failed to connect QuickBooks" / "oauth_failed" error**
- **Most common cause**: `redirect_uri` mismatch between client and server
- Verify `VITE_SUPABASE_URL` (client) matches the Supabase project URL used by the `quickbooks-oauth-callback` Edge Function
- Ensure both match what's registered in the Intuit Developer Portal
- Check Edge Function logs for detailed error messages

**"Authorization has expired"**
- Click **Reconnect QuickBooks** to re-authorize
- Refresh tokens expire after 100 days without use

### Export issues

**"Team does not have a QuickBooks customer mapping"**
- Navigate to team settings and map a QuickBooks customer

**"Work order must be assigned to a team"**
- Assign the work order to a team before exporting

**"Failed to create invoice"**
- Check the QuickBooks API logs in Supabase
- Ensure the customer still exists in QuickBooks
- Verify the QuickBooks company has proper permissions

**"Could not find or create a valid Service Item" / income account errors**
- Ensure your QuickBooks company has at least one active **Income** account
- Optionally set `QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID` or `QBO_INVOICE_ITEM_INCOME_ACCOUNT_NAME` so auto-created **Labor** / **Parts** items attach to the correct account
- Confirm **Labor** and **Parts** products exist (or allow EquipQR to create them)

### API rate limits

QuickBooks API has rate limits. If you encounter throttling:
- Reduce frequency of customer searches
- Batch export operations during off-peak hours

## Development

### Running tests

```bash
npm test -- --grep quickbooks
```

### QuickBooks export invoice (Deno)

From `supabase/functions` (uses `deno.json`):

```bash
deno test --allow-env --allow-net=quickbooks.api.intuit.com ./quickbooks-export-invoice/quickbooks-export-invoice.deno.test.ts
```

### Local development

1. Use Intuit **Development** app credentials (same keys as preview sandbox).
2. Run `bash dev/ops/local-env.sh` so `supabase/functions/.env` includes `QBO_USE_SANDBOX=true`.
3. Register the local callback URI in the Intuit Developer Portal (Development app → Keys & OAuth).
4. Capture the integration once: `npm run e2e:quickbooks-auth:capture` (see `docs/ops/playwright-real-auth-integrations.md`).
5. Restart the **full** local stack after env changes (`bash dev/linux/dev.sh stop` then `bash dev/linux/dev.sh start`). Do not use ad-hoc `npx supabase stop` / `start`.
6. Probe the QBO API from the shell: `bash dev/qbo/query.sh -StatusOnly`.

## Production invoice export

Live QBO connections and team→customer mappings are org-specific (exact
IDs live in the private ops runbook / 1Password, not in this repo).
EquipQR creates invoices for review from work order details via
Export → QuickBooks (**Create New Invoice** / **Update Invoice #…** /
**Open Invoice**). Export is gated on a completed work order +
team→customer mapping + `can_manage_quickbooks`.

Invoice export requires a review/confirmation exchange. `action: "review"`
returns customer terms, persisted business dates, current QuickBooks values,
service amounts, and a source fingerprint without creating QuickBooks items or
invoices. `action: "export"` requires explicit calendar dates, that fingerprint,
and the reviewed invoice ID/SyncToken. Unknown business dates have no clock or
work-order scheduling fallback. Billing inputs are persisted separately in
`work_order_invoice_details`; authenticated column grants exclude the protected
QuickBooks line mapping.

PM exports as a distinct zero-priced service line; public findings and parts
detail go in CustomerMemo. Sparse updates preserve QuickBooks prices and
service dates using a server-owned mapping bound to company and invoice IDs.
Unmapped legacy invoices and invoices with online payments enabled require
updates directly in QuickBooks. Header date/term replacements require explicit
confirmation; clearing existing payment terms must be done in QuickBooks.

Creation sets online credit-card and ACH payment flags false and EmailStatus
NotSet, and never invokes the send endpoint. Intuit's imported-invoice delivery
behavior depends on company settings: an API create is not inherently a draft
state. Price review and deliberate sending remain separate user steps.

**Intuit passkey chooser blocks automation.** Use the logged-in
`cursor-ide-browser` session. `bash dev/e2e/env.sh qbo-browser`
exists for retries.

Customer steps: [Export a work order to QuickBooks](../support/admin-integrations/export-work-order-to-qb.md).

## API reference

### Service methods

```typescript
import {
  getConnectionStatus,
  searchCustomers,
  exportInvoice,
  getTeamCustomerMapping,
  updateTeamCustomerMapping,
} from '@/services/quickbooks';

// Check connection status
const status = await getConnectionStatus(organizationId);

// Search customers
const { customers } = await searchCustomers(organizationId, 'search query');

// Export invoice
// confirmation comes from the reviewed invoice details, never the current clock.
const result = await exportInvoice(workOrderId, confirmation);
```

### React hooks

```typescript
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksCustomers } from '@/hooks/useQuickBooksCustomers';
import { useExportToQuickBooks } from '@/hooks/useExportToQuickBooks';

// Get connection status
const { data: connectionStatus } = useQuickBooksConnection(organizationId);

// Search customers
const { data: customers } = useQuickBooksCustomers(organizationId, searchQuery);

// Export mutation
const exportMutation = useExportToQuickBooks();
exportMutation.mutate({ workOrderId, confirmation });
```
