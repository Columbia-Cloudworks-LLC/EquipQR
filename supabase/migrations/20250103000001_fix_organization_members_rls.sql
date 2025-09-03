-- Fix organization_members RLS infinite recursion
-- The current policies cause infinite recursion by querying organization_members 
-- from within organization_members policies

-- Drop policies first to avoid dependency issues
DROP POLICY IF EXISTS "organization_members_select_safe" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select_secure" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert_safe" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_safe" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete_safe" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete" ON organization_members;

-- Drop existing functions if they exist (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.user_is_org_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_org_admin(uuid, uuid) CASCADE;

-- Create security definer functions that can bypass RLS for membership checks
-- These functions use non-ambiguous parameter names to avoid conflicts with column names
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid, check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs with definer rights, bypassing RLS
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id uuid, check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs with definer rights, bypassing RLS
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
      AND user_id = check_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$;

-- Create new RLS policies using the security definer functions
-- SELECT policy: Users can see members of organizations they belong to
CREATE POLICY "organization_members_select_safe" ON organization_members
FOR SELECT TO authenticated
USING (
  -- User can see their own membership record
  user_id = auth.uid()
  OR
  -- User can see other members in organizations they belong to
  user_is_org_member(organization_id)
);

-- INSERT policy: Only admins can add members
CREATE POLICY "organization_members_insert_safe" ON organization_members
FOR INSERT TO authenticated
WITH CHECK (
  user_is_org_admin(organization_id)
);

-- UPDATE policy: Only admins can update memberships
CREATE POLICY "organization_members_update_safe" ON organization_members
FOR UPDATE TO authenticated
USING (
  user_is_org_admin(organization_id)
);

-- DELETE policy: Only admins can remove members
CREATE POLICY "organization_members_delete_safe" ON organization_members
FOR DELETE TO authenticated
USING (
  user_is_org_admin(organization_id)
);

-- Grant execute permissions on the security definer functions
GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_org_admin(uuid, uuid) TO authenticated;

-- Add comments to document the fix
COMMENT ON FUNCTION public.user_is_org_member(uuid, uuid) 
IS 'Security definer function to check organization membership without RLS recursion. Fixed parameter naming to avoid ambiguity.';

COMMENT ON FUNCTION public.user_is_org_admin(uuid, uuid) 
IS 'Security definer function to check admin permissions without RLS recursion. Fixed parameter naming to avoid ambiguity.';

COMMENT ON POLICY "organization_members_select_safe" ON organization_members 
IS 'Fixed SELECT policy using security definer functions to prevent infinite recursion. Users can see their own membership and members of organizations they belong to.';
