-- Fix invitation system constraint to allow re-inviting users
-- Remove the overly restrictive unique constraint and replace with a partial index

-- Step 1: Drop the existing unique constraint that prevents re-inviting users
ALTER TABLE organization_invitations 
DROP CONSTRAINT IF EXISTS organization_invitations_organization_id_email_status_key;

-- Step 2: Create a partial unique index that only applies to pending invitations
-- This allows multiple expired/declined invitations for the same email while preventing duplicate pending ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_pending_unique 
ON organization_invitations (organization_id, lower(trim(email))) 
WHERE status = 'pending';

-- Step 3: Add a comment to document the constraint logic
COMMENT ON INDEX idx_org_invitations_pending_unique IS 
'Ensures only one pending invitation per email per organization, while allowing multiple expired/declined invitations for re-inviting';

-- Step 4: Update the atomic invitation creation function to handle the new constraint
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

  -- Check for existing PENDING invitation only (now that we allow multiple expired/declined)
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
    -- Handle the new partial unique constraint violation
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for this email';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'INVITATION_ERROR: %', SQLERRM;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Invitation system constraint fixed.';
  RAISE NOTICE 'Users can now be re-invited after their invitations expire or are declined.';
  RAISE NOTICE 'Only pending invitations are prevented from being duplicated.';
END $$;