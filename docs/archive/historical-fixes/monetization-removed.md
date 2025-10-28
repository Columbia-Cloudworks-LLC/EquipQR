# Monetization Removal - EquipQR

## Summary

This document tracks the removal of Stripe and billing functionality from EquipQR. The app is now fully free for all users with no payment required.

**Date**: January 2025  
**Status**: Complete ✅

## Changes Made

### 1. Feature Flag System (`src/lib/flags.ts`)
- Created `BILLING_DISABLED` flag (default: `true`)
- Controlled via environment variable `BILLING_DISABLED`

### 2. Environment Configuration
- Added `BILLING_DISABLED=true` to `env.example`
- Deprecated Stripe environment variables (kept for rollback compatibility)

### 3. Billing Utilities Updated
- `shouldBlockInvitation()`: Returns `false` when billing disabled
- `hasLicenses()`: Returns `true` when billing disabled
- `isFreeOrganization()`: Returns `false` when billing disabled

### 4. Routes and Navigation Removed
- `/dashboard/billing` route removed
- `/dashboard/debug/billing` route removed
- `/dashboard/debug/exemptions-admin` route removed
- Billing navigation removed from sidebar

### 5. Data Preservation
- Historical billing data preserved in database tables
- Stripe subscription IDs remain (harmless)
- No data loss occurred

## Impact

All users now have access to all features without payment. RBAC and RLS policies still enforce security and multi-tenancy.

## Migration

Migrations created:
- `20251028012503_deprecate_billing.sql` - Functions and views
- `20251028022133_deprecate_existing_billing_tables.sql` - Table comments

## Related Documentation
- `docs/deployment/database-migrations.md`
- Migration files in `supabase/migrations/`

**Last Updated**: January 2025

