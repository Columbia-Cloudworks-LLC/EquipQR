-- FINAL SOLUTION: Eliminate all circular dependencies in RLS policies
-- This migration creates ultra-simple policies that only use the bypass functions

-- Step 1: Drop ALL existing policies that could cause circular dependencies
DROP POLICY IF EXISTS "org_members_basic_select" ON organization_members;
DROP POLICY IF EXISTS "org_members_basic_insert" ON organization_members;
DROP POLICY IF EXISTS "org_members_basic_update" ON organization_members;
DROP POLICY IF EXISTS "org_members_basic_delete" ON organization_members;

DROP POLICY IF EXISTS "invitation_basic_insert" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_basic_update" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_basic_select" ON organization_invitations;

-- Step 2: Create minimal RLS policies that NEVER query organization_members table
-- These policies only use direct comparisons and bypass functions

-- Organization Members: Only allow users to see/modify their own records
-- Admins can manage others using bypass functions ONLY
CREATE POLICY "org_members_minimal_select"
  ON organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()  -- Users can always see their own membership
  );

CREATE POLICY "org_members_minimal_insert"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()  -- Users can only insert themselves
  );

CREATE POLICY "org_members_minimal_update"
  ON organization_members
  FOR UPDATE
  USING (
    user_id = auth.uid()  -- Users can only update their own records
  );

CREATE POLICY "org_members_minimal_delete"
  ON organization_members
  FOR DELETE
  USING (
    user_id = auth.uid()  -- Users can only delete their own records
  );

-- For admin operations, we'll use the bypass functions in application code

-- Organization Invitations: Completely bypass RLS using functions
CREATE POLICY "invitation_minimal_select"
  ON organization_invitations
  FOR SELECT
  USING (
    invited_by = auth.uid()  -- Users can see invitations they sent
  );

CREATE POLICY "invitation_minimal_insert"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()  -- Users can only create invitations as themselves
  );

CREATE POLICY "invitation_minimal_update"
  ON organization_invitations
  FOR UPDATE
  USING (
    invited_by = auth.uid()  -- Users can only update invitations they sent
  );

-- Step 3: Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Step 4: Add helper function for admin permission checks that applications can use
CREATE OR REPLACE FUNCTION public.check_admin_permission_safe(
  user_uuid uuid,
  org_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean := false;
BEGIN
  -- Use the raw bypass function
  SELECT public.raw_check_admin_bypass(user_uuid, org_id) INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return false on any error
  RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_admin_permission_safe(uuid, uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: All circular dependencies eliminated using minimal RLS policies.';
  RAISE NOTICE 'Organization members table now uses only direct user_id comparisons.';
  RAISE NOTICE 'Admin operations should use bypass functions in application code.';
END $$;