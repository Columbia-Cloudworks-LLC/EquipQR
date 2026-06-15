# QuickBooks Online Integration

This document describes how to set up and use the QuickBooks Online integration in EquipQR. This integration allows organizations to export work orders as draft invoices directly to QuickBooks.

## Overview

The QuickBooks integration provides:

- **OAuth 2.0 Connection**: Secure authorization flow to connect QuickBooks accounts
- **Team-Customer Mapping**: Associate EquipQR teams with QuickBooks customers
- **Invoice Export**: Export completed work orders as draft invoices with cost details

## Prerequisites

1. **Intuit Developer Account**: You need an Intuit Developer account and a QuickBooks Online app
2. **QuickBooks Online Account**: An active QuickBooks Online company (sandbox or production)
3. **Admin/Owner Access**: Only organization admins and owners can manage the QuickBooks integration

## Environment Configuration

### Client-Side Environment Variables

Add to your `.env` file:

```env
# Intuit OAuth Client ID (public, for initiating OAuth)
VITE_INTUIT_CLIENT_ID=your-client-id
```

### Supabase Edge Function Secrets

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
| Local | Development | Development | `true` (via `sync-local-supabase-env.ps1`) | Sandbox | `app.sandbox.qbo.intuit.com` |
| Preview | Development | Development | `true` (via secrets sync) | Sandbox | `app.sandbox.qbo.intuit.com` |
| Production | Production | Production | unset | Live | `app.qbo.intuit.com` |

**Why both Development keys and `QBO_USE_SANDBOX`?** Intuit OAuth with Development credentials authorizes **sandbox** companies. The API host flag ensures token refresh and invoice export hit `sandbox-quickbooks.api.intuit.com` instead of the production API (mixing them yields 403s).

After switching preview to sandbox, **disconnect and reconnect** QuickBooks on preview.equipqr.app so stored tokens match the sandbox realm.

Client-side: align `VITE_INTUIT_CLIENT_ID` in `app-env-preview-public` with `INTUIT_CLIENT_ID` in `edge-env-preview-secrets` (same Development client ID).

**OAuth redirect URI (derived — do not set separate redirect base secrets)**

EquipQR derives the QuickBooks OAuth callback from the canonical Supabase URL:

- Browser: `VITE_SUPABASE_URL`
- Edge token exchange: `SUPABASE_URL`

Register the derived callback URI in the Intuit Developer Portal:

| Environment | Intuit redirect URI |
|-------------|---------------------|
| Production | `https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback` |
| Preview | `https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback` |
| Local | `http://localhost:54321/functions/v1/quickbooks-oauth-callback` |

Legacy `VITE_QB_OAUTH_REDIRECT_BASE_URL` / `QB_OAUTH_REDIRECT_BASE_URL` overrides are deprecated. Remove them from Vercel and Supabase secrets if still present; OAuth callbacks are derived from the Supabase URL as described above.

### Vault Secrets (Token Refresh Scheduler)

The token refresh scheduler requires vault secrets. Run this SQL in each Supabase environment:

```sql
INSERT INTO vault.secrets (name, secret)
VALUES 
  ('service_role_key', '<your-service-role-key>'), 
  ('supabase_url', 'https://<your-project-ref>.supabase.co');
```

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `service_role_key` | Supabase service role key | Dashboard → Settings → API → Project API keys → service_role (secret) |
| `supabase_url` | Supabase project URL | Dashboard → Settings → API → Project URL |

Configure separately for each environment (preview, production).

### Setting Up Intuit Developer App

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

## Usage

### 1. Connecting QuickBooks

1. Navigate to **Organization Settings** → **Integrations**
2. Click **Connect to QuickBooks Online**
3. Authorize the connection in the Intuit OAuth window
4. Return to EquipQR to confirm the connection

### 2. Mapping Teams to Customers

Before exporting invoices, map each team to a QuickBooks customer:

1. Navigate to **Teams** → Select a team
2. Find the **QuickBooks Customer** card
3. Click **Select Customer** to search and map a customer
4. The mapping is saved automatically

### 3. Exporting Work Orders as Invoices

1. Navigate to a work order detail page
2. Click the **Take Action** dropdown
3. Select **Export to QuickBooks**
4. The draft invoice is created in QuickBooks

**Requirements for export:**
- Work order must be assigned to a team
- The team must have a QuickBooks customer mapping
- User must be an admin or owner

### Invoice Details

Exported draft invoices include **summarized billing lines** mapped from EquipQR work-order costs (EquipQR remains the source of truth for itemized inventory and labor detail):

- **Labor** (`SalesItemLineDetail`): Billable labor from work-order cost rows titled **Labor** / **Labor - …** (no inventory link). If no labor cost row exists but technicians logged hours, a Labor line can be generated from the configured default hourly rate (see Edge secrets). Quantity reflects logged hours when present; otherwise a single quantity `1` line at the blended rate.
- **Parts** (`SalesItemLineDetail`): One **summarized** non-inventory line for **all other** work-order costs — manual parts/materials, inventory consumption lines, and any former truck/fee-style rows (`Qty` 1, `UnitPrice` = total dollars). EquipQR does **not** sync inventory quantities or COGS into QuickBooks.

**Customer-facing descriptions** on the primary line (Labor when present, otherwise Parts) can include:

- Preventative maintenance context when a PM record exists: template name, all-OK summary (`condition === 1` only), or exception rows only; PM notes; then **Public notes:** from non-private work-order notes.

**Private Note** (unchanged): EquipQR work order ID, dates, **private** notes, and **full itemized cost breakdown** (per cost row).

**Customer Memo**: Timeline + resolution summary (unchanged).

#### QuickBooks products & Edge Function secrets

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

### Database Tables

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

### Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `refresh-quickbooks-tokens` | Every 15 minutes | Refreshes access tokens expiring within 15 minutes to prevent connection drops |

### Security

- **Token Storage**: Access and refresh tokens are stored server-side only
- **RLS Policies**: All tables have Row Level Security restricting access to admin/owner roles
- **OAuth State**: CSRF protection via state parameter and session validation
- **Feature Flag**: Integration can be disabled via environment variable

## Troubleshooting

### Connection Issues

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

### Export Issues

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

### API Rate Limits

QuickBooks API has rate limits. If you encounter throttling:
- Reduce frequency of customer searches
- Batch export operations during off-peak hours

## Development

### Running Tests

```bash
npm test -- --grep quickbooks
```

### QuickBooks export invoice (Deno)

From `supabase/functions` (uses `deno.json`):

```bash
deno test --allow-env --allow-net=quickbooks.api.intuit.com ./quickbooks-export-invoice/quickbooks-export-invoice.deno.test.ts
```

### Local Development

1. Use Intuit **Development** app credentials (same keys as preview sandbox).
2. Run `.\scripts\sync-local-supabase-env.ps1` so `supabase/functions/.env` includes `QBO_USE_SANDBOX=true`.
3. Register the local callback URI in the Intuit Developer Portal (Development app → Keys & OAuth).
4. Capture the integration once: `npm run e2e:quickbooks-auth:capture` (see `docs/ops/playwright-real-auth-integrations.md`).
5. Restart Supabase after env changes: `npx supabase stop; npx supabase start -x logflare -x vector`
6. Probe the QBO API from the shell: `.\scripts\qbo\Invoke-QboQuery.ps1 -StatusOnly`.

## API Reference

### Service Methods

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
const result = await exportInvoice(workOrderId);
```

### React Hooks

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
exportMutation.mutate(workOrderId);
```

## Support

For issues with the QuickBooks integration:

1. Check the browser console for errors
2. Review Supabase edge function logs
3. Verify environment configuration
4. Contact support with export logs from the database
