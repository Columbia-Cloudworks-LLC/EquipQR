-- Fix infinite recursion in organization_members RLS policy
-- The organization_members_select_secure policy queries organization_members directly,
-- which causes infinite recursion because the query triggers the RLS policy again.
-- Solution: Use is_org_member() function which bypasses RLS (SECURITY DEFINER with row_security=off)

BEGIN;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "organization_members_select_secure" ON "public"."organization_members";

-- Create a secure SELECT policy using is_org_member() function
-- This function bypasses RLS (SECURITY DEFINER with row_security=off) to avoid recursion
CREATE POLICY "organization_members_select_secure" ON "public"."organization_members" 
FOR SELECT 
TO authenticated
USING (
  -- Use is_org_member() function which bypasses RLS to check membership
  -- This prevents infinite recursion while maintaining security
  "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  OR
  -- Also allow users to see their own membership record
  "user_id" = (select "auth"."uid"())
);

-- Update the comment to reflect the fix
COMMENT ON POLICY "organization_members_select_secure" ON "public"."organization_members" 
IS 'Secure SELECT policy: Users can view organization_members records for organizations they belong to. 
Uses is_org_member() function to avoid infinite recursion (function bypasses RLS). 
Also allows users to see their own membership record directly.';

COMMIT;
