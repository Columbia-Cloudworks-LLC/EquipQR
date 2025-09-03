-- Fix organization_members security vulnerability
-- The current SELECT policy allows public access to all organization member data
-- This creates a critical security vulnerability as described in the GitHub issue

-- Drop the current insecure SELECT policy
DROP POLICY IF EXISTS "organization_members_select" ON "public"."organization_members";

-- Create a secure SELECT policy that only allows users to see members within their own organizations
CREATE POLICY "organization_members_select_secure" ON "public"."organization_members" 
FOR SELECT 
TO authenticated
USING (
  -- Only allow access to organization_members records where the current user
  -- is also a member of the same organization
  EXISTS (
    SELECT 1 
    FROM "public"."organization_members" "user_org"
    WHERE "user_org"."user_id" = (SELECT "auth"."uid"())
      AND "user_org"."organization_id" = "organization_members"."organization_id"
      AND "user_org"."status" = 'active'
  )
);

-- Add a comment to document the security fix
COMMENT ON POLICY "organization_members_select_secure" ON "public"."organization_members" 
IS 'Security fix: Restrict SELECT access to only allow users to see members within their own organizations. Prevents unauthorized access to organizational structure data.';

-- Verify the policy was created correctly
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organization_members' 
  AND cmd = 'SELECT';

