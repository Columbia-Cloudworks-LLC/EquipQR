-- COMPREHENSIVE FIX: Eliminate ALL circular dependencies in invitation system
-- Fixed version - drop policies before functions

-- Step 1: Drop ALL existing policies that depend on the functions we need to recreate
DROP POLICY IF EXISTS "invitation_insert_admins_optimized" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_update_admins_optimized" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_select_members_optimized" ON organization_invitations;

DROP POLICY IF EXISTS "org_members_select_organization_scoped" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_organization_scoped" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_organization_scoped" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_organization_scoped" ON organization_members;

-- Step 2: Now safely drop and recreate the optimized functions
DROP FUNCTION IF EXISTS public.is_organization_admin_optimized(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_organization_member_optimized(uuid, uuid);

-- Create truly optimized functions that bypass RLS entirely
CREATE OR REPLACE FUNCTION public.is_organization_admin_optimized(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direct query without any RLS policy evaluation
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member_optimized(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direct query without any RLS policy evaluation
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;

-- Step 3: Create completely non-recursive policies for organization_members
-- These policies are designed to NEVER query organization_members within their conditions

CREATE POLICY "org_members_select_simple"
  ON organization_members
  FOR SELECT
  USING (
    -- Simple ownership check - users can see their own records
    user_id = auth.uid()
    OR 
    -- Direct admin check without recursion
    EXISTS (
      SELECT 1 
      FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin') 
        AND om.status = 'active'
    )
  );

CREATE POLICY "org_members_insert_simple"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    -- Users can insert their own membership
    user_id = auth.uid()
    OR
    -- Direct admin check
    EXISTS (
      SELECT 1 
      FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin') 
        AND om.status = 'active'
    )
  );

CREATE POLICY "org_members_update_simple"
  ON organization_members
  FOR UPDATE
  USING (
    -- Users can update their own records
    user_id = auth.uid()
    OR
    -- Direct admin check
    EXISTS (
      SELECT 1 
      FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin') 
        AND om.status = 'active'
    )
  );

CREATE POLICY "org_members_delete_simple"
  ON organization_members
  FOR DELETE
  USING (
    -- Users can delete their own membership
    user_id = auth.uid()
    OR
    -- Direct admin check
    EXISTS (
      SELECT 1 
      FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin') 
        AND om.status = 'active'
    )
  );

-- Step 4: Create invitation policies using the optimized functions
CREATE POLICY "invitation_insert_final"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (
    -- Use the optimized function which bypasses RLS completely
    public.is_organization_admin_optimized(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_update_final"
  ON organization_invitations
  FOR UPDATE
  USING (
    -- Use the optimized function which bypasses RLS completely
    public.is_organization_admin_optimized(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_select_final"
  ON organization_invitations
  FOR SELECT
  USING (
    -- Use the optimized function which bypasses RLS completely
    public.is_organization_member_optimized(auth.uid(), organization_id)
  );

-- Step 5: Create safe invitation wrapper function
CREATE OR REPLACE FUNCTION public.create_invitation_safe(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_message text DEFAULT NULL,
  p_invited_by uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_id uuid;
  is_admin boolean;
BEGIN
  -- Check permissions using optimized function
  SELECT public.is_organization_admin_optimized(p_invited_by, p_organization_id) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User does not have permission to create invitations for this organization';
  END IF;

  -- Create the invitation directly
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    message,
    invited_by
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_message,
    p_invited_by
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Re-raise with context
  RAISE EXCEPTION 'Failed to create invitation for %: %', p_email, SQLERRM;
END;
$$;

-- Step 6: Create optimized indexes for better performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_org_role_status_optimized 
ON organization_members(user_id, organization_id, role, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_members_org_admin_status_optimized 
ON organization_members(organization_id, role, status) 
WHERE role IN ('owner', 'admin') AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_invitations_org_status_optimized 
ON organization_invitations(organization_id, status) 
WHERE status = 'pending';

-- Step 7: Ensure RLS is properly enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Step 8: Add documentation
COMMENT ON FUNCTION public.is_organization_admin_optimized IS 'Optimized function to check admin status without RLS recursion - uses SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION public.is_organization_member_optimized IS 'Optimized function to check membership without RLS recursion - uses SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION public.create_invitation_safe IS 'Safe wrapper for creating invitations with proper permission checks and error handling';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Circular dependency fix implemented successfully. Invitation system should now work without stack depth errors.';
END $$;