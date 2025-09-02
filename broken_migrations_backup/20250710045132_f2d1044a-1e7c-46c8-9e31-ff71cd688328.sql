-- Fix invitation acceptance flow by adding RLS policy for invited users and atomic acceptance function

-- 1. Add RLS policy to allow invited users to view organization details
CREATE POLICY "invited_users_can_view_org_details"
  ON organizations
  FOR SELECT
  USING (
    -- Allow if user is already a member (existing policy logic)
    check_org_access_secure(auth.uid(), id)
    OR
    -- Allow if user has a valid pending invitation for this organization
    EXISTS (
      SELECT 1 
      FROM organization_invitations oi
      WHERE oi.organization_id = organizations.id
        AND oi.status = 'pending'
        AND oi.expires_at > now()
        AND auth.email() IS NOT NULL
        AND lower(trim(oi.email)) = lower(trim(auth.email()))
    )
  );

-- 2. Create atomic invitation acceptance function
CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(
  p_invitation_token uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  invitation_record RECORD;
  org_name TEXT;
  result jsonb;
BEGIN
  -- Get invitation details
  SELECT id, organization_id, email, role, status, expires_at, accepted_by
  INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token;
  
  -- Validate invitation exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Validate invitation status
  IF invitation_record.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been processed');
  END IF;
  
  -- Validate invitation not expired
  IF invitation_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;
  
  -- Validate user email matches invitation email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id 
      AND lower(trim(email)) = lower(trim(invitation_record.email))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email does not match invitation email');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id 
      AND organization_id = invitation_record.organization_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  END IF;
  
  -- Begin the atomic acceptance process
  
  -- 1. Update invitation status
  UPDATE organization_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now()
  WHERE id = invitation_record.id;
  
  -- 2. Create organization membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status
  ) VALUES (
    invitation_record.organization_id,
    p_user_id,
    invitation_record.role,
    'active'
  );
  
  -- Get organization name for response
  SELECT name INTO org_name
  FROM organizations
  WHERE id = invitation_record.organization_id;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'organization_name', COALESCE(org_name, 'Unknown Organization'),
    'role', invitation_record.role
  );
  
  RETURN result;
  
EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to accept invitation: ' || SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invitation_atomic(uuid, uuid) TO authenticated;