# Billing Exemptions Admin Dashboard

## Overview

The billing exemptions admin dashboard allows super administrators to grant billing exemptions to organizations. This is useful for:

- **Testing accounts**: Grant exemptions to development/testing organizations
- **Special agreements**: Honor partnership agreements or promotional arrangements
- **Trial periods**: Provide temporary exemptions for evaluation periods

## Access Control

### Super Admin Organization

Access to the billing exemptions dashboard is restricted to users who are **owners or admins** in the designated super admin organization:

- **Organization**: Columbia Cloudworks
- **Organization ID**: `dabce056-c0d8-46dd-b173-a3c0084f3133`

### Configuration

**Frontend** (`.env` file):
```env
VITE_SUPER_ADMIN_ORG_ID=dabce056-c0d8-46dd-b173-a3c0084f3133
```

**Backend** (Supabase Edge Function Secrets):
```
SUPER_ADMIN_ORG_ID=dabce056-c0d8-46dd-b173-a3c0084f3133
```

## Features

### View Exemptions

- Filter exemptions by organization or view all
- See exemption details: type, value, reason, grant date, expiration
- View exemption status: Active, Inactive, or Expired

### Create Exemptions

Grant new billing exemptions to any organization:

1. Select the organization
2. Choose exemption type:
   - **User Licenses**: Additional license capacity
   - **Storage**: Additional storage capacity
   - **Other**: Custom exemptions
3. Set the exemption value (number)
4. Provide a reason (optional but recommended)
5. Set expiration date (optional, defaults to never expires)

### Edit Exemptions

Update existing exemptions:

- Change exemption type or value
- Update reason
- Modify expiration date
- Toggle active/inactive status

### Delete Exemptions

Permanently remove exemptions. The organization will immediately lose the exempted capacity.

## Implementation Details

### Database Schema

**Table**: `billing_exemptions`

```sql
CREATE TABLE billing_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exemption_type TEXT NOT NULL DEFAULT 'user_licenses',
  exemption_value INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Edge Functions

**`list-organizations-admin`**
- Lists all organizations with member counts
- Requires super admin access
- Used to populate organization dropdown

**`manage-billing-exemptions`**
- Handles CRUD operations for exemptions
- Routes:
  - `GET /list` - List exemptions (optionally filter by organization)
  - `POST /create` - Create new exemption
  - `PUT /update` - Update existing exemption
  - `DELETE /delete` - Delete exemption
- Requires super admin access
- Uses service role key to bypass RLS

### Frontend Components

**Page**: `src/pages/BillingExemptionsAdmin.tsx`
- Main dashboard UI
- Organization filter dropdown
- Exemptions table with actions
- Create/edit/delete dialogs

**Hooks**: 
- `src/hooks/useSuperAdminAccess.ts` - Checks user access
- `src/hooks/useBillingExemptions.ts` - Data fetching and mutations

**Services**: 
- `src/services/billingExemptionsService.ts` - API calls to edge functions

**Types**: 
- `src/types/billingExemptions.ts` - TypeScript interfaces

### Access Flow

```
User Login
    ↓
Check Organization Context
    ↓
Is user owner/admin in Columbia Cloudworks?
    ↓
YES → Show "Billing Exemptions" in sidebar
    ↓
Navigate to /admin/billing-exemptions
    ↓
Verify access (useSuperAdminAccess hook)
    ↓
Edge functions verify access (verifySuperAdminAccess)
    ↓
Display dashboard
```

## Security Considerations

1. **Dual validation**: Access is verified both client-side (UI) and server-side (edge functions)
2. **Service role usage**: Edge functions use service role key to bypass RLS for admin operations
3. **Audit trail**: All exemptions track who granted them and when
4. **Environment isolation**: Super admin org ID is configured via environment variables
5. **No public access**: Dashboard not visible to regular users

## Usage Example

### Creating a Test Account Exemption

1. Log in as an owner/admin in Columbia Cloudworks
2. Navigate to **Billing Exemptions** in the sidebar
3. Click **Create Exemption**
4. Select the test organization
5. Choose **User Licenses** as type
6. Enter value: `10`
7. Reason: "Testing account - 10 free licenses for QA team"
8. Leave expiration empty (never expires)
9. Click **Create Exemption**

The test organization now has 10 additional license slots without billing.

## Current Exemptions

As of implementation (October 2025):

| Organization | Type | Value | Reason |
|-------------|------|-------|--------|
| Matthew Hankins | user_licenses | 2 | Special arrangement - 2 free user licenses |
| Columbia Cloudworks | user_licenses | 500 | Testing exemption for development |

## Troubleshooting

### "Access Denied" Error

- Ensure you're logged into the Columbia Cloudworks organization
- Verify your role is owner or admin
- Check that `VITE_SUPER_ADMIN_ORG_ID` is set correctly
- Restart dev server after env changes

### Edge Functions Returning 500

- Verify `SUPER_ADMIN_ORG_ID` secret is set in Supabase
- Check edge function logs in Supabase Dashboard
- Ensure functions are deployed with latest code
- Redeploy functions after secret changes

### Empty Organizations List

- Check edge function logs for errors
- Verify database has organizations
- Test the edge function directly in Supabase Dashboard

## Related Documentation

- [Billing and Pricing](./billing-and-pricing.md) - How billing works
- [Roles and Permissions](./roles-and-permissions.md) - User roles in organizations
- [Edge Function Secrets](../deployment/edge-function-secrets.md) - Configuration guide
- [Database Schema](../architecture/database-schema.md) - Database structure

## Future Enhancements

Potential improvements for the feature:

1. **Email notifications** when exemptions are created/modified/deleted
2. **Expiration warnings** for exemptions expiring soon
3. **Usage tracking** to show how exemptions are being used
4. **Bulk operations** for managing multiple exemptions at once
5. **Audit log** showing all exemption changes over time
6. **Approval workflow** for exemption requests

