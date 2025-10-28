# Billing Migration Order Fix

## Problem Summary

The migration `20250115000000_deprecate_billing.sql` was failing with the error:
```
ERROR: relation "user_license_subscriptions" does not exist (SQLSTATE 42P01)
```

This occurred because the migration attempted to add `COMMENT ON TABLE` statements for billing tables before those tables were created.

## Root Cause

**Migration Timestamp Paradox**: The billing deprecation migration had a January 2025 timestamp but was created after the September 2025 `remote_schema.sql` migration. When running migrations on a fresh database (like `supabase db reset`), Supabase executes migrations in timestamp order:

1. ✅ `20250103000000_fix_function_search_path.sql`
2. ❌ `20250115000000_deprecate_billing.sql` ← **FAILED HERE** (tables don't exist yet)
3. ✅ `20250901235558_remote_schema.sql` ← Creates the billing tables
4. ✅ Other migrations...

## Tables Affected

**Tables that exist in `remote_schema.sql`:**
- `billing_events` (created at line 2852)
- `billing_exemptions` (created at line 2869)
- `billing_usage` (created at line 2891)
- `user_license_subscriptions` (created at line 3413)
- `organization_subscriptions` (created at line 3193)
- `stripe_event_logs` (created at line 3359)

**Table that doesn't exist:**
- `billing_features` (referenced in deprecation migration but never created)

## Solution Implemented

Split the billing deprecation logic into two migrations:

### 1. Modified `20250115000000_deprecate_billing.sql`
**Changes:**
- Removed all `COMMENT ON TABLE` statements for billing tables
- Removed `COMMENT ON COLUMN` statements for organization columns
- Removed billing constraints check
- **Kept:**
  - `user_entitlements` view creation (doesn't depend on billing tables)
  - `billing_is_disabled()` function
  - `user_has_access()` function
  - Documentation about deprecated Edge Functions

**Purpose:** Contains only table-independent logic that can run early in the migration chain.

### 2. Created `20250902000000_deprecate_existing_billing_tables.sql`
**New migration that runs AFTER `remote_schema.sql`:**
- Adds deprecation comments to all 6 existing billing tables
- Adds deprecation comments to billing-related organization columns
- Includes comprehensive documentation for future developers
- Uses timestamp `20250902000000` to ensure it runs after `20250901235558_remote_schema.sql`

## Migration Order (Fixed)

```
20250103000000 - fix_function_search_path.sql
20250115000000 - deprecate_billing.sql              ← Creates views/functions only
20250125000000 - prevent_duplicate_org_names_on_invite.sql
20250126000000 - rls_performance_indexes.sql
20250126000001 - safe_unused_index_cleanup.sql
20250901235558 - remote_schema.sql                   ← Creates billing tables
20250902000000 - deprecate_existing_billing_tables.sql ← NOW comments on tables ✅
20250902123800 - performance_optimization.sql
20250902124500 - complete_performance_fix.sql
... (other migrations)
```

## Testing

The fix ensures:
- ✅ Fresh database setup works (`supabase db reset`)
- ✅ Existing databases remain unaffected
- ✅ CI/CD pipelines can test complete migration chain
- ✅ New developers can bootstrap the project successfully

**Production Verification:**
- ✅ Migration `20250902000000_deprecate_existing_billing_tables` applied successfully to production
- ✅ All billing table comments added
- ✅ `user_entitlements` view created successfully
- ✅ Organization column deprecation comments added

## Validation

Run the migration validator:
```bash
node scripts/supabase-fix-migrations.mjs
```

Expected result: Both billing migrations should pass validation.

## Future Considerations

As noted in the new migration file, if re-implementing monetization in the future:
1. All deprecated billing tables can be safely dropped
2. Create new schema from scratch with new Stripe product IDs
3. Re-integrate Stripe with updated webhooks and Edge Functions
4. Don't reuse the old billing table structures

## Rollback

To rollback these changes:

1. Delete the new migration:
   ```bash
   rm supabase/migrations/20250902000000_deprecate_existing_billing_tables.sql
   ```

2. Restore original `20250115000000_deprecate_billing.sql` from git history

3. Run `supabase db reset`

Note: This would restore the broken state where fresh database setup fails.

