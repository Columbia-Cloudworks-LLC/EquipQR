-- Fix for stack depth limit exceeded in invitation system
-- Create functions that truly bypass RLS using row_security = off

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS public.raw_check_admin_bypass(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.raw_check_member_bypass(uuid, uuid) CASCADE;

-- Create new functions that completely bypass RLS
CREATE OR REPLACE FUNCTION public.check_admin_bypass_fixed(
  user_uuid uuid, 
  org_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off  -- This completely disables RLS for this function
AS $$
DECLARE
  result boolean := false;
BEGIN
  -- Direct query without RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_member_bypass_fixed(
  user_uuid uuid, 
  org_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off  -- This completely disables RLS for this function
AS $$
DECLARE
  result boolean := false;
BEGIN
  -- Direct query without RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Update create_invitation_bypass to use the fixed function
CREATE OR REPLACE FUNCTION public.create_invitation_bypass(
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
  -- Use the fixed bypass function
  SELECT public.check_admin_bypass_fixed(p_invited_by, p_organization_id) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User % does not have permission to create invitations for organization %', p_invited_by, p_organization_id;
  END IF;

  -- Direct INSERT without any RLS triggers
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

-- Update get_user_invitations_safe
CREATE OR REPLACE FUNCTION public.get_user_invitations_safe(
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
AS $$
BEGIN
  -- Use the fixed bypass function
  IF public.check_admin_bypass_fixed(user_uuid, org_id) THEN
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

-- Update can_manage_invitation_safe
CREATE OR REPLACE FUNCTION public.can_manage_invitation_safe(
  user_uuid uuid,
  invitation_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id uuid;
  is_admin boolean := false;
  is_inviter boolean := false;
BEGIN
  SELECT organization_id, (invited_by = user_uuid) 
  INTO org_id, is_inviter
  FROM organization_invitations
  WHERE id = invitation_id;
  
  IF is_inviter THEN
    RETURN true;
  END IF;
  
  IF org_id IS NOT NULL THEN
    SELECT public.check_admin_bypass_fixed(user_uuid, org_id) INTO is_admin;
    RETURN is_admin;
  END IF;
  
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Grant execute permissions to the new functions
GRANT EXECUTE ON FUNCTION public.check_admin_bypass_fixed(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_member_bypass_fixed(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invitation_bypass(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_invitations_safe(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_invitation_safe(uuid, uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Fixed stack depth limit exceeded error in invitation system.';
  RAISE NOTICE 'Created bypass functions with row_security = off to prevent circular RLS dependencies.';
END $$;