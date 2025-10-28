# Monetization Removal - EquipQR

## Summary

This document tracks the removal of Stripe and billing functionality from EquipQR. The app is now fully free for all users with no payment required.

## Date

Created: January 2025

## Changes Made

### 1. Feature Flag System (`src/lib/flags.ts`)

Created a feature flag system to control billing features:
- `BILLING_DISABLED`: When `true`, disables all billing and payment features
- Default: `true` (billing disabled by default)
- Can be controlled via environment variable `BILLING_DISABLED`

### 2. Environment Configuration (`env.example`)

Updated to:
- Add `BILLING_DISABLED=true` flag
- Mark Stripe environment variables as deprecated (kept for rollback compatibility)
- Document the billing removal

### 3. Billing Utilities

Updated `src/utils/billing/index.ts`:
- `shouldBlockInvitation()`: Returns `false` when billing is disabled
- `hasLicenses()`: Returns `true` when billing is disabled
- `isFreeOrganization()`: Returns `false` when billing is disabled

### 4. Organization Restrictions

Updated restriction utilities to bypass billing checks:
- `src/utils/simplifiedOrganizationRestrictions.ts`: Grants all features when billing disabled
- `src/utils/organizationRestrictions.ts`: Grants all features when billing disabled

### 5. Routes and Navigation

Removed from app:
- `/dashboard/billing` route (commented out in `src/App.tsx`)
- `/dashboard/debug/billing` route (commented out)
- `/dashboard/debug/exemptions-admin` route (commented out)
- Billing navigation item removed from sidebar (`src/components/layout/AppSidebar.tsx`)

### 6. Data Preservation

**Historical billing data is preserved**:
- Stripe subscription IDs remain in database (harmless)
- Billing tables (`billing_events`, `user_license_subscriptions`, etc.) kept intact
- Customer IDs and related metadata preserved
- No data loss occurred

## Still TODO

### Edge Functions to Remove/Disable

The following Edge Functions should be removed or disabled as they call Stripe APIs:

1. `supabase/functions/check-subscription/` - Check subscription status
2. `supabase/functions/create-checkout/` - Create Stripe checkout session
3. `supabase/functions/customer-portal/` - Access Stripe customer portal
4. `supabase/functions/create-fleetmap-checkout/` - Fleet map checkout
5. `supabase/functions/purchase-user-licenses/` - Purchase licenses
6. `supabase/functions/refresh-fleetmap-subscription/` - Refresh fleet map subscription
7. `supabase/functions/stripe-fleetmap-webhook/` - Fleet map webhook
8. `supabase/functions/stripe-license-webhook/` - License webhook
9. `supabase/functions/stripe-webhook/` - Generic Stripe webhook

**Recommendation**: Either delete these functions or add early-return guards when `BILLING_DISABLED=true`.

### Database Migration

Create a non-destructive migration to:
1. Add deprecation comments to billing tables
2. Make billing-related columns nullable where needed
3. Create a view for universal entitlements (all users have access to everything)
4. Ensure existing data remains intact

Example migration structure:
```sql
-- Mark billing tables as deprecated (non-destructive)
COMMENT ON TABLE user_license_subscriptions IS 'DEPRECATED: Billing removed. Table preserved for historical data.';
COMMENT ON TABLE billing_events IS 'DEPRECATED: Billing removed. Table preserved for historical data.';

-- Create universal entitlements view
CREATE OR REPLACE VIEW user_entitlements AS
SELECT 
  u.id AS user_id,
  'free'::text AS plan,
  true AS is_active,
  now() AS granted_at
FROM auth.users u;

-- Ensure no foreign key constraints block user creation
-- (Add if needed based on current schema)
```

### Tests Update

Update or remove billing-related tests:
- Remove tests for checkout/portal/webhook
- Update access tests to assert all features are available
- Add regression tests for invitation flow without billing

### Hooks Cleanup

Review and update hooks that reference billing:
- `src/hooks/useSubscription.ts`: Deprecate or bypass
- Billing-related hooks in `src/hooks/`

## Security Notes

1. **No payment gates remain**: All features depend only on authentication roles
2. **RBAC still enforced**: User permissions (owner, admin, member) still apply
3. **RLS policies unchanged**: Row-level security continues to protect multi-tenant data

## Rollback Plan

To rollback these changes:

1. Revert the PR that merged this branch
2. Set `BILLING_DISABLED=false` in environment
3. Re-enable commented routes in `App.tsx`
4. Restore sidebar navigation items
5. Re-enable Edge Functions
6. (Optional) Remove deprecation comments from database

## Environment Variables

### Added
- `BILLING_DISABLED`: Controls whether billing features are enabled (default: true)

### Deprecated (kept for rollback)
- `STRIPE_SECRET_KEY`: No longer used but kept for compatibility
- `STRIPE_WEBHOOK_SECRET`: No longer used but kept for compatibility

## Impact

### Positive
- ✅ All users have access to all features
- ✅ No payment processing overhead
- ✅ Simpler onboarding for new users
- ✅ Reduced operational complexity

### Considerations
- Historical billing data remains in database (harmless)
- Stripe integration code still exists (commented or disabled)
- Edge Functions still deployed (non-functional without Stripe credentials)

## Testing Checklist

- [x] App builds without errors
- [ ] User can create organization
- [ ] User can invite members without billing checks
- [ ] User can create equipment
- [ ] User can create work orders
- [ ] User can upload files
- [ ] All features accessible (no paywalls)
- [ ] No 4xx/5xx errors from missing Stripe config
- [ ] Navigation doesn't show "Billing" option

## Migration Status

- ✅ Code updates complete
- ⏳ Database migration pending
- ⏳ Edge Functions cleanup pending
- ⏳ Tests update pending

## Related Documentation

- [System Architecture](./architecture/system-architecture.md)
- [Database Schema](./architecture/database-schema.md)
- [Deployment Guide](./deployment/deployment-guide.md)

