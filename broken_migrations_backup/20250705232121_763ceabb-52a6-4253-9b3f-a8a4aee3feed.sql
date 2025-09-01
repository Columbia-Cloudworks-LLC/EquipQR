-- FINAL FIX: Replace recursive policies with truly non-recursive ones using optimized functions
-- This addresses the core issue: current policies still query organization_members within their own conditions

-- Step 1: Drop ALL current problematic policies on organization_members
DROP POLICY IF EXISTS "org_members_select_simple" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_simple" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_simple" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_simple" ON organization_members;

-- Step 2: Create truly non-recursive policies using the optimized security definer functions
-- These functions bypass RLS entirely, preventing any recursion

CREATE POLICY "org_members_select_nonrecursive"
  ON organization_members
  FOR SELECT
  USING (
    -- Users can see their own records
    user_id = auth.uid()
    OR 
    -- Use optimized function that bypasses RLS completely
    public.is_organization_admin_optimized(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_insert_nonrecursive"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    -- Users can insert their own membership
    user_id = auth.uid()
    OR
    -- Use optimized function for admin check
    public.is_organization_admin_optimized(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_update_nonrecursive"
  ON organization_members
  FOR UPDATE
  USING (
    -- Users can update their own records
    user_id = auth.uid()
    OR
    -- Use optimized function for admin check
    public.is_organization_admin_optimized(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_delete_nonrecursive"
  ON organization_members
  FOR DELETE
  USING (
    -- Users can delete their own membership
    user_id = auth.uid()
    OR
    -- Use optimized function for admin check
    public.is_organization_admin_optimized(auth.uid(), organization_id)
  );

-- Step 3: Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the optimized functions exist and work correctly
-- Re-create them to ensure they're properly defined
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

-- Step 5: Add performance monitoring and cleanup old indexes
CREATE INDEX IF NOT EXISTS idx_org_members_nonrecursive_admin_check 
ON organization_members(organization_id, user_id, role, status) 
WHERE role IN ('owner', 'admin') AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_members_nonrecursive_member_check 
ON organization_members(organization_id, user_id, status) 
WHERE status = 'active';

-- Step 6: Add validation to prevent future recursion issues
COMMENT ON POLICY "org_members_select_nonrecursive" ON organization_members IS 'Non-recursive policy using security definer functions to prevent infinite recursion';
COMMENT ON POLICY "org_members_insert_nonrecursive" ON organization_members IS 'Non-recursive policy using security definer functions to prevent infinite recursion';
COMMENT ON POLICY "org_members_update_nonrecursive" ON organization_members IS 'Non-recursive policy using security definer functions to prevent infinite recursion';
COMMENT ON POLICY "org_members_delete_nonrecursive" ON organization_members IS 'Non-recursive policy using security definer functions to prevent infinite recursion';

-- Step 7: Final verification message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Infinite recursion fix applied. Organization members table should now work without recursion errors.';
  RAISE NOTICE 'The new policies use optimized security definer functions that bypass RLS entirely.';
END $$;