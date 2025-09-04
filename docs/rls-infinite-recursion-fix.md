# RLS Infinite Recursion Fix

## Problem Description

The EquipQR application was experiencing infinite recursion errors when trying to load organization data. The error message was:

```
infinite recursion detected in policy for relation "organization_members"
```

This prevented users from logging in and accessing the application.

## Root Cause

The issue was caused by circular dependency in Row Level Security (RLS) policies on the `organization_members` table. The policies were trying to query the `organization_members` table from within the policies that govern access to that same table, creating an infinite loop.

Specifically, the `organization_members_select_secure` policy was using this logic:
```sql
EXISTS (
  SELECT 1 
  FROM "public"."organization_members" "user_org"
  WHERE "user_org"."user_id" = (SELECT "auth"."uid"())
    AND "user_org"."organization_id" = "organization_members"."organization_id"
    AND "user_org"."status" = 'active'
)
```

When a user tried to query `organization_members`, the RLS policy would execute, which in turn would query `organization_members` again, triggering the same policy, creating infinite recursion.

## Solution

The fix involved creating **security definer functions** that can bypass RLS policies when checking membership status. These functions run with elevated privileges and can access the `organization_members` table directly without triggering the RLS policies.

### Key Changes

1. **Created Security Definer Functions:**
   - `user_is_org_member(org_id uuid, check_user_id uuid)` - Checks if a user is a member of an organization
   - `user_is_org_admin(org_id uuid, check_user_id uuid)` - Checks if a user has admin/owner permissions

2. **Replaced RLS Policies:**
   - Dropped all existing `organization_members` policies
   - Created new policies that use the security definer functions instead of direct table queries

3. **Fixed Parameter Naming:**
   - Used non-ambiguous parameter names (`check_user_id` instead of `user_id`) to avoid conflicts with table column names

### New RLS Policies

- **SELECT**: Users can see their own membership record OR members of organizations they belong to
- **INSERT**: Only organization admins can add new members
- **UPDATE**: Only organization admins can update memberships  
- **DELETE**: Only organization admins can remove members

## Security Considerations

- The security definer functions run with elevated privileges but only perform specific, safe membership checks
- The functions still respect the business logic (only active members, proper role checks)
- No sensitive data is exposed beyond what users should already have access to
- The fix maintains the same security boundaries as before, just without the infinite recursion

## Testing

After applying the fix:
- ✅ Organization membership queries execute without infinite recursion
- ✅ Users can successfully log in and access their organizations
- ✅ Security advisor shows no critical issues
- ✅ All RBAC permissions are maintained

## Files Changed

- `supabase/migrations/20250103000001_fix_organization_members_rls.sql` - Migration containing the complete fix
- `docs/rls-infinite-recursion-fix.md` - This documentation file

## Risk Assessment

**Risk Level:** L2 (Medium) - Security/RBAC changes

**Rollback Plan:** 
If issues arise, the migration can be rolled back by:
1. Dropping the new security definer functions
2. Recreating the original policies (though this would bring back the infinite recursion)
3. A proper rollback would require implementing an alternative solution

**Validation:**
- All existing organization membership functionality works as expected
- No security boundaries are compromised
- Performance impact is minimal (security definer functions are efficient)

## Related Issues

This fix resolves the console errors showing:
- `infinite recursion detected in policy for relation "organization_members"`
- `Failed to fetch memberships` errors in SimpleOrganizationProvider
- Application failing to load after authentication
