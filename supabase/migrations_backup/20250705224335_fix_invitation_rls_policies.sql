-- Fix invitation RLS policies to prevent circular dependencies
-- Replace direct organization_members queries with security definer functions

-- Step 1: Drop existing problematic invitation policies
DROP POLICY IF EXISTS "Admins can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON organization_invitations;

-- Step 2: Create new policies using security definer functions (no recursion)
CREATE POLICY "invitation_insert_admins"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "invitation_update_admins"
  ON organization_invitations
  FOR UPDATE
  USING (is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "invitation_select_members"
  ON organization_invitations
  FOR SELECT
  USING (is_organization_member(auth.uid(), organization_id));

-- Add comment for clarity
COMMENT ON TABLE organization_invitations IS 'RLS policies updated to use security definer functions to prevent circular dependencies';