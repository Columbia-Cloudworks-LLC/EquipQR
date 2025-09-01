-- Complete RLS policy implementation for invitation system
-- Add missing DELETE policy for organization_invitations

CREATE POLICY "invitation_minimal_delete"
  ON organization_invitations
  FOR DELETE
  USING (
    invited_by = auth.uid()  -- Users can only delete invitations they sent
  );

-- Add enhanced security function for invitation management
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
  -- Get organization ID and check if user is the inviter
  SELECT organization_id, (invited_by = user_uuid) 
  INTO org_id, is_inviter
  FROM public.organization_invitations
  WHERE id = invitation_id;
  
  -- If user is the inviter, they can manage it
  IF is_inviter THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin of the organization
  IF org_id IS NOT NULL THEN
    SELECT public.raw_check_admin_bypass(user_uuid, org_id) INTO is_admin;
    RETURN is_admin;
  END IF;
  
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_manage_invitation_safe(uuid, uuid) TO authenticated;

-- Add function to safely get user's invitations
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
  -- Check if user is admin of the organization
  IF public.raw_check_admin_bypass(user_uuid, org_id) THEN
    -- Admins can see all invitations for their organization
    RETURN QUERY
    SELECT 
      oi.id,
      oi.email,
      oi.role,
      oi.status,
      oi.message,
      oi.created_at,
      oi.expires_at,
      oi.accepted_at,
      oi.declined_at,
      oi.expired_at,
      oi.slot_reserved,
      oi.slot_purchase_id
    FROM public.organization_invitations oi
    WHERE oi.organization_id = org_id
    ORDER BY oi.created_at DESC;
  ELSE
    -- Regular users can only see invitations they sent
    RETURN QUERY
    SELECT 
      oi.id,
      oi.email,
      oi.role,
      oi.status,
      oi.message,
      oi.created_at,
      oi.expires_at,
      oi.accepted_at,
      oi.declined_at,
      oi.expired_at,
      oi.slot_reserved,
      oi.slot_purchase_id
    FROM public.organization_invitations oi
    WHERE oi.organization_id = org_id
      AND oi.invited_by = user_uuid
    ORDER BY oi.created_at DESC;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_invitations_safe(uuid, uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Enhanced RLS policies and security functions implemented.';
  RAISE NOTICE 'Added DELETE policy for invitations and enhanced security functions.';
END $$;