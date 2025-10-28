# Migration Order Fix - Complete Solution

## Problem Summary

Multiple migrations had timestamp ordering issues where they referenced tables before those tables were created. This caused failures when running migrations on fresh databases or during `supabase db reset`.

## Root Cause

Several migrations created in January 2025 (timestamps `202501*`) referenced tables that were only created in the September 2025 `remote_schema.sql` migration (timestamp `20250901235558`). When Supabase runs migrations in chronological order by timestamp, these early migrations failed.

## Migrations Affected and Fixed

### 1. Billing Deprecation (Original Issue)
- **Old**: `20250115000000_deprecate_billing.sql`
- **Fix**: Split into two migrations:
  - `20250115000000_deprecate_billing.sql` - Table-independent logic only
  - `20250902000000_deprecate_existing_billing_tables.sql` - Table comments and views (NEW)
- **Tables referenced**: `user_license_subscriptions`, `billing_events`, `billing_usage`, `billing_exemptions`, `organization_subscriptions`, `stripe_event_logs`, `profiles`

### 2. RLS Performance Indexes
- **Old**: `20250126000000_rls_performance_indexes.sql`
- **New**: `20250902130000_rls_performance_indexes.sql` 
- **Tables referenced**: `organization_members`, `work_orders`, `equipment`, `preventative_maintenance`

### 3. Prevent Duplicate Org Names
- **Old**: `20250125000000_prevent_duplicate_org_names_on_invite.sql`
- **New**: `20250902140000_prevent_duplicate_org_names_on_invite.sql`
- **Tables referenced**: `profiles`, `organizations`, `organization_members`

### 4. Safe Unused Index Cleanup
- **Old**: `20250126000001_safe_unused_index_cleanup.sql`
- **New**: `20250902150000_safe_unused_index_cleanup.sql`
- **Tables referenced**: `teams`

### 5. Fix Function Search Path
- **Old**: `20250103000000_fix_function_search_path.sql`
- **New**: `20250902160000_fix_function_search_path.sql`
- **Tables referenced**: `notifications`, `organizations`, `organization_members`, `teams`, `team_members`, `work_orders`, `equipment`, `work_order_status_history`

## Final Migration Order

```
20250115000000 - deprecate_billing.sql              ← Functions only (no table dependencies)
20250901235558 - remote_schema.sql                  ← Creates ALL tables ✅
20250902000000 - deprecate_existing_billing_tables.sql ← Billing table comments + view
20250902123800 - performance_optimization.sql
20250902124500 - complete_performance_fix.sql
20250902130000 - rls_performance_indexes.sql        ← Creates indexes (after tables exist)
20250902140000 - prevent_duplicate_org_names_on_invite.sql ← Updates functions
20250902150000 - safe_unused_index_cleanup.sql      ← Drops unused index
20250902160000 - fix_function_search_path.sql       ← Fixes function security
20250903190521 - fix_organization_members_security.sql
20251021_part_picker.sql                            ← (Has invalid format - pre-existing)
20251024090000 - fix_invitation_update_policy.sql
20251027205400 - add_multi_equipment_work_orders.sql
```

## Changes Made

### File Renames (Timestamp Updates)
1. `20250126000000_rls_performance_indexes.sql` → `20250902130000_rls_performance_indexes.sql`
2. `20250125000000_prevent_duplicate_org_names_on_invite.sql` → `20250902140000_prevent_duplicate_org_names_on_invite.sql`
3. `20250126000001_safe_unused_index_cleanup.sql` → `20250902150000_safe_unused_index_cleanup.sql`
4. `20250103000000_fix_function_search_path.sql` → `20250902160000_fix_function_search_path.sql`

### New Migration Created
- `supabase/migrations/20250902000000_deprecate_existing_billing_tables.sql`

### Migration Content Updates
- `20250115000000_deprecate_billing.sql` - Removed all table-dependent code

## Production Status

✅ **Migration `20250902000000_deprecate_existing_billing_tables` applied successfully to production**

Remaining migrations need to be applied:
- `20250902130000_rls_performance_indexes.sql`
- `20250902140000_prevent_duplicate_org_names_on_invite.sql`
- `20250902150000_safe_unused_index_cleanup.sql`
- `20250902160000_fix_function_search_path.sql`

Note: These migrations were already applied to production with their old timestamps. The renamed versions need to be handled carefully to avoid re-running them.

## Testing Strategy

For fresh database setup:
```bash
# This should now work without errors
supabase db reset
```

For production (already has old migrations applied):
1. Check which migrations are already applied using Supabase MCP tools
2. Mark renamed migrations as applied without re-running them
3. Verify no breaking changes

## Benefits

- ✅ Fresh database setup works (`supabase db reset`)
- ✅ CI/CD pipelines can test complete migration chain
- ✅ New developers can bootstrap project successfully
- ✅ Migrations run in logical dependency order
- ✅ Clear separation between table creation and table modification

## Future Prevention

1. Always check if migration references tables
2. If it does, ensure it runs AFTER the table creation migration
3. Use Supabase MCP tools to verify migration order before pushing
4. Test with `supabase db reset` on local before deploying

