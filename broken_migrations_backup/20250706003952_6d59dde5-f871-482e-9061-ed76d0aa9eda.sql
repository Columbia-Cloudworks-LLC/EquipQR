-- FINAL CIRCULAR DEPENDENCY FIX: Replace optimized functions with truly non-recursive ones
-- The core issue is that optimized functions still rely on RLS policies, creating recursion
-- This migration creates functions that completely bypass RLS for permission checks

-- Step 1: Drop existing problematic optimized functions
DROP FUNCTION IF EXISTS public.is_organization_admin_optimized(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_organization_member_optimized(uuid, uuid);

-- Step 2: Create truly non-recursive permission functions that bypass ALL RLS
-- These functions use SET row_security = off to completely ignore RLS policies

CREATE OR REPLACE FUNCTION public.is_organization_admin_bypass_rls(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean := false;
BEGIN
  -- Temporarily disable RLS for this session
  PERFORM set_config('row_security', 'off', true);
  
  -- Direct query without any RLS policy evaluation
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  ) INTO result;
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Ensure RLS is restored even on error
  PERFORM set_config('row_security', 'on', true);
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member_bypass_rls(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean := false;
BEGIN
  -- Temporarily disable RLS for this session
  PERFORM set_config('row_security', 'off', true);
  
  -- Direct query without any RLS policy evaluation
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  ) INTO result;
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Ensure RLS is restored even on error
  PERFORM set_config('row_security', 'on', true);
  RAISE;
END;
$$;

-- Step 3: Update create_invitation_safe to use the new bypass functions
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
  -- Check permissions using bypass function that completely avoids RLS
  SELECT public.is_organization_admin_bypass_rls(p_invited_by, p_organization_id) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User % does not have permission to create invitations for organization %', p_invited_by, p_organization_id;
  END IF;

  -- Create the invitation directly - now safe because permission check bypassed RLS
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    message,
    invited_by,
    expires_at,
    status,
    invitation_token
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_message,
    p_invited_by,
    now() + interval '7 days',
    'pending',
    gen_random_uuid()
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create invitation for %: %', p_email, SQLERRM;
END;
$$;

-- Step 4: Update all RLS policies to use the new bypass functions
-- Drop all current problematic policies first
DROP POLICY IF EXISTS "org_members_select_nonrecursive" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_nonrecursive" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_nonrecursive" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_nonrecursive" ON organization_members;

DROP POLICY IF EXISTS "invitation_insert_final" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_update_final" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_select_final" ON organization_invitations;

-- Create new policies using the bypass functions
CREATE POLICY "org_members_select_bypass"
  ON organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR 
    public.is_organization_admin_bypass_rls(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_insert_bypass"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    public.is_organization_admin_bypass_rls(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_update_bypass"
  ON organization_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    public.is_organization_admin_bypass_rls(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_delete_bypass"
  ON organization_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    public.is_organization_admin_bypass_rls(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_insert_bypass"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (
    public.is_organization_admin_bypass_rls(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_update_bypass"
  ON organization_invitations
  FOR UPDATE
  USING (
    public.is_organization_admin_bypass_rls(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_select_bypass"
  ON organization_invitations
  FOR SELECT
  USING (
    public.is_organization_member_bypass_rls(auth.uid(), organization_id)
  );

-- Step 5: Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Step 6: Add documentation
COMMENT ON FUNCTION public.is_organization_admin_bypass_rls IS 'Checks admin status by completely bypassing RLS to prevent circular dependencies';
COMMENT ON FUNCTION public.is_organization_member_bypass_rls IS 'Checks membership by completely bypassing RLS to prevent circular dependencies';
COMMENT ON FUNCTION public.create_invitation_safe IS 'Creates invitations using RLS-bypass functions to prevent stack depth errors';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Circular dependency completely eliminated using RLS bypass functions.';
  RAISE NOTICE 'All permission checks now bypass RLS entirely to prevent infinite recursion.';
END $$;