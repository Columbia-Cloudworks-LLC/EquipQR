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
# Enable QuickBooks integration (set to 'true' to enable)
VITE_ENABLE_QUICKBOOKS=false

# Intuit OAuth Client ID (public, for initiating OAuth)
VITE_INTUIT_CLIENT_ID=your-client-id
```

### Supabase Edge Function Secrets

Configure these secrets in Supabase Dashboard → Edge Functions → Secrets:

| Secret Name | Description |
|-------------|-------------|
| `INTUIT_CLIENT_ID` | Your Intuit app's Client ID |
| `INTUIT_CLIENT_SECRET` | Your Intuit app's Client Secret |
| `QUICKBOOKS_SANDBOX` | Set to `"true"` for sandbox, `"false"` for production |
| `ENABLE_QB_PDF_ATTACHMENT` | Set to `"true"` to enable PDF attachments on exported invoices (default: `"false"`) |

### Vault Secrets (Token Refresh Scheduler)

The QuickBooks token refresh scheduler runs every 15 minutes via `pg_cron` and requires vault secrets to call the Edge Function securely. These must be configured **manually** in each Supabase environment after the migration runs.

**Run this SQL in the Supabase SQL Editor for each environment:**

```sql
-- Insert vault secrets (replace with actual values for each environment)
INSERT INTO vault.secrets (name, secret)
VALUES 
  ('service_role_key', '<YOUR_SERVICE_ROLE_KEY>'),
  ('supabase_url', 'https://<YOUR_PROJECT_REF>.supabase.co');
```

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `service_role_key` | Supabase service role key | Dashboard → Settings → API → Project API keys → service_role (secret) |
| `supabase_url` | Supabase project URL | Dashboard → Settings → API → Project URL |

**Important**: Each environment (preview, production) has different keys. Configure them separately.

### Setting Up Intuit Developer App

1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create a new app or use an existing one
3. Configure OAuth settings:
   - **Redirect URI**: `https://your-supabase-url.supabase.co/functions/v1/quickbooks-oauth-callback`
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

Exported invoices include:

- **Line Item**: Single service line item with total cost (uses "EquipQR Services" item)
- **Description**: Work order details, equipment info, and public notes
- **Private Note**: Work order ID, dates, private notes, and cost breakdown
- **Customer Memo**: Work order title
- **PDF Attachment** (optional): When `ENABLE_QB_PDF_ATTACHMENT` is enabled, a PDF containing public work order information is automatically attached to the invoice

#### Service Item Selection

When exporting, the system will use a QuickBooks service item in this priority:
1. An existing item named "EquipQR Services"
2. Any active Service-type item in your QuickBooks account
3. Auto-create an "EquipQR Services" item (requires an Income account to exist)

#### PDF Attachments

When PDF attachments are enabled (`ENABLE_QB_PDF_ATTACHMENT=true`), the system will:

1. **Generate a PDF** containing:
   - Work order title, status, and priority
   - Equipment information (name, model, serial number)
   - Customer/team name
   - Work order description
   - **Public notes only** (private notes are excluded from the PDF)
   - List of public images (image names and descriptions)

2. **Attach the PDF** to the QuickBooks invoice using the Attachable API
   - The PDF is set to `IncludeOnSend: true`, so it will be included when the invoice is sent to the customer
   - For updated invoices, any existing PDF attachments are automatically removed and replaced with the new version

3. **Privacy Protection**:
   - Only public notes and images are included in the PDF
   - Private notes and cost details remain in the invoice's `PrivateNote` field only
   - Images associated with private notes are excluded from the PDF

**Note**: PDF generation and attachment failures are logged but do not prevent the invoice from being created or updated. The invoice export will succeed even if PDF attachment fails.

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

**"Could not find or create a valid Service Item"**
- The system automatically searches for or creates an "EquipQR Services" item
- Ensure your QuickBooks account has at least one Income account (required for item creation)
- Check that EquipQR has permission to create items in your QuickBooks company

**"PDF attachment failed"**
- Check that `ENABLE_QB_PDF_ATTACHMENT` is set correctly in Supabase Edge Function secrets
- Review edge function logs for PDF generation errors
- Verify that the work order has public notes or images to include in the PDF
- Note: Invoice export will still succeed even if PDF attachment fails

### API Rate Limits

QuickBooks API has rate limits. If you encounter throttling:
- Reduce frequency of customer searches
- Batch export operations during off-peak hours

## Development

### Running Tests

```bash
npm test -- --grep quickbooks
```

### Local Development

1. Set up a QuickBooks sandbox company
2. Configure sandbox credentials
3. Set `QUICKBOOKS_SANDBOX=true` in edge function secrets
4. Use `ngrok` or similar for local OAuth callback testing

### Feature Flags

The integration is controlled by feature flags:

**QuickBooks Integration** (`VITE_ENABLE_QUICKBOOKS`):
```typescript
import { isQuickBooksEnabled } from '@/lib/flags';

if (isQuickBooksEnabled()) {
  // Show QuickBooks features
}
```

**PDF Attachments** (`VITE_ENABLE_QB_PDF_ATTACHMENT`):
```typescript
import { isQBPDFAttachmentEnabled } from '@/lib/flags';

if (isQBPDFAttachmentEnabled()) {
  // PDF attachment feature is enabled
}
```

**Note**: The PDF attachment feature requires both:
- Client-side flag: `VITE_ENABLE_QB_PDF_ATTACHMENT=true` (for UI purposes)
- Server-side flag: `ENABLE_QB_PDF_ATTACHMENT=true` (in Supabase Edge Function secrets)

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
