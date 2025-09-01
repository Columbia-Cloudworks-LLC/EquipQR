-- Solution 2: Direct Database Function Approach - Complete Fix for Invitation Recursion
-- This eliminates all circular dependencies by creating atomic, bypass functions

-- Step 1: Create a completely atomic invitation creation function
CREATE OR REPLACE FUNCTION public.create_invitation_atomic(
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
SET row_security TO 'off'
AS $$
DECLARE
  invitation_id uuid;
  admin_check_result boolean := false;
BEGIN
  -- Direct admin check - completely bypass RLS
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = p_invited_by 
      AND organization_id = p_organization_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO admin_check_result;
  
  IF NOT admin_check_result THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: User does not have admin privileges';
  END IF;

  -- Check for existing active invitation
  IF EXISTS (
    SELECT 1 FROM organization_invitations 
    WHERE organization_id = p_organization_id 
      AND lower(trim(email)) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for this email';
  END IF;

  -- Direct insert with minimal overhead
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

-- Step 2: Create atomic invitation retrieval function
CREATE OR REPLACE FUNCTION public.get_invitations_atomic(
  user_uuid uuid, 
  org_id uuid
)
RETURNS TABLE(
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
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
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

-- Step 3: Create atomic permission check function
CREATE OR REPLACE FUNCTION public.can_manage_invitation_atomic(
  user_uuid uuid, 
  invitation_id uuid
)
RETURNS boolean
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_invitation_atomic(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitations_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_invitation_atomic(uuid, uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Direct Database Function Approach implemented.';
  RAISE NOTICE 'All circular dependencies eliminated with atomic functions.';
  RAISE NOTICE 'Functions bypass RLS completely to prevent recursion.';
END $$;