-- ULTIMATE FIX: Complete elimination of circular dependencies
-- This approach uses SECURITY DEFINER functions that query the base tables directly
-- without any RLS policy evaluation whatsoever

-- Step 1: Drop ALL existing problematic policies and functions
DROP POLICY IF EXISTS "org_members_select_bypass" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_bypass" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_bypass" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_bypass" ON organization_members;

DROP POLICY IF EXISTS "invitation_insert_bypass" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_update_bypass" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_select_bypass" ON organization_invitations;

DROP FUNCTION IF EXISTS public.is_organization_admin_bypass_rls(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_organization_member_bypass_rls(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_invitation_safe(uuid, text, text, text, uuid);

-- Step 2: Create completely isolated permission functions using raw SQL access
-- These functions have SECURITY DEFINER and query tables directly without invoking any policies
CREATE OR REPLACE FUNCTION public.check_admin_direct(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direct SQL query with no function calls that could trigger RLS
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_member_direct(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direct SQL query with no function calls that could trigger RLS
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;

-- Step 3: Create invitation function using the direct check functions
CREATE OR REPLACE FUNCTION public.create_invitation_direct(
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
  -- Use direct check function that won't trigger RLS recursion
  SELECT public.check_admin_direct(p_invited_by, p_organization_id) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User % does not have permission to create invitations for organization %', p_invited_by, p_organization_id;
  END IF;

  -- Create the invitation
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

-- Step 4: Create simple, non-recursive RLS policies using the direct functions
CREATE POLICY "org_members_select_direct"
  ON organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR 
    public.check_admin_direct(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_insert_direct"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    public.check_admin_direct(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_update_direct"
  ON organization_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    public.check_admin_direct(auth.uid(), organization_id)
  );

CREATE POLICY "org_members_delete_direct"
  ON organization_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    public.check_admin_direct(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_insert_direct"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (
    public.check_admin_direct(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_update_direct"
  ON organization_invitations
  FOR UPDATE
  USING (
    public.check_admin_direct(auth.uid(), organization_id)
  );

CREATE POLICY "invitation_select_direct"
  ON organization_invitations
  FOR SELECT
  USING (
    public.check_member_direct(auth.uid(), organization_id)
  );

-- Step 5: Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Step 6: Add documentation
COMMENT ON FUNCTION public.check_admin_direct IS 'Direct admin check using raw SQL without any RLS policy evaluation';
COMMENT ON FUNCTION public.check_member_direct IS 'Direct member check using raw SQL without any RLS policy evaluation';
COMMENT ON FUNCTION public.create_invitation_direct IS 'Creates invitations using direct permission checks to prevent all recursion';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Circular dependency completely eliminated using direct SQL functions.';
  RAISE NOTICE 'All permission checks now use raw SQL queries that bypass RLS entirely.';
END $$;