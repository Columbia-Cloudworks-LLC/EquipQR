-- Complete fix for stack depth limit exceeded in invitation system
-- This migration optimizes the invitation creation process and adds performance improvements

-- Step 1: Add database indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org_active 
  ON organization_members(user_id, organization_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_status 
  ON organization_invitations(organization_id, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_organization_invitations_email_org 
  ON organization_invitations(email, organization_id);

-- Step 2: Create ultra-optimized bypass functions that completely avoid RLS
DROP FUNCTION IF EXISTS public.create_invitation_bypass_optimized(uuid, text, text, text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.create_invitation_bypass_optimized(
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
SET row_security TO 'off'  -- Completely disable RLS for this function
AS $$
DECLARE
  invitation_id uuid;
  admin_check_result boolean := false;
BEGIN
  -- Direct admin check without any RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = p_invited_by 
      AND organization_id = p_organization_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO admin_check_result;
  
  IF NOT admin_check_result THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: User does not have admin privileges for organization %', p_organization_id;
  END IF;

  -- Check for existing invitation
  IF EXISTS (
    SELECT 1 FROM organization_invitations 
    WHERE organization_id = p_organization_id 
      AND lower(trim(email)) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for %', p_email;
  END IF;

  -- Direct INSERT with minimal overhead
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
  
EXCEPTION 
  WHEN SQLSTATE '23505' THEN
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An invitation to this email already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'INVITATION_ERROR: %', SQLERRM;
END;
$$;

-- Step 3: Create optimized function to get invitations without RLS overhead
CREATE OR REPLACE FUNCTION public.get_invitations_bypass_optimized(
  user_uuid uuid,
  org_id uuid
) RETURNS TABLE(
  id uuid,
  email text,
  role text,
  status text,
  message text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  declined_at timestamp with time zone,
  expired_at timestamp with time zone,
  slot_reserved boolean,
  slot_purchase_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  is_admin_result boolean := false;
BEGIN
  -- Direct admin check
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO is_admin_result;
  
  IF is_admin_result THEN
    -- Admins see all invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    ORDER BY oi.created_at DESC;
  ELSE
    -- Regular users see only their own invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
      AND oi.invited_by = user_uuid
    ORDER BY oi.created_at DESC;
  END IF;
END;
$$;

-- Step 4: Create function to check invitation management permissions
CREATE OR REPLACE FUNCTION public.can_manage_invitation_optimized(
  user_uuid uuid,
  invitation_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  org_id uuid;
  invited_by_user uuid;
  is_admin_result boolean := false;
BEGIN
  -- Get invitation details
  SELECT organization_id, invited_by 
  INTO org_id, invited_by_user
  FROM organization_invitations
  WHERE id = invitation_id;
  
  -- If user created the invitation, they can manage it
  IF invited_by_user = user_uuid THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin
  IF org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ) INTO is_admin_result;
    
    RETURN is_admin_result;
  END IF;
  
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_invitation_bypass_optimized(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitations_bypass_optimized(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_invitation_optimized(uuid, uuid) TO authenticated;

-- Step 5: Add performance monitoring function
CREATE OR REPLACE FUNCTION public.log_invitation_performance(
  function_name text,
  execution_time_ms numeric,
  success boolean,
  error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log to a simple table for monitoring (create if not exists)
  CREATE TABLE IF NOT EXISTS invitation_performance_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name text NOT NULL,
    execution_time_ms numeric NOT NULL,
    success boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
  );
  
  INSERT INTO invitation_performance_logs (
    function_name, 
    execution_time_ms, 
    success, 
    error_message
  ) VALUES (
    function_name, 
    execution_time_ms, 
    success, 
    error_message
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail to avoid blocking main operations
  NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_invitation_performance(text, numeric, boolean, text) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Optimized invitation system implementation completed.';
  RAISE NOTICE 'Added indexes, bypass functions, and performance monitoring.';
  RAISE NOTICE 'Stack depth limit exceeded error should now be resolved.';
END $$;