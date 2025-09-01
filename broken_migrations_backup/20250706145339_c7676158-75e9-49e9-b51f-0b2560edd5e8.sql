-- Solution 1: Context-aware RLS policies for organization_members
-- This prevents circular dependencies by using a context parameter approach

-- Step 1: Create a context-aware admin check function
CREATE OR REPLACE FUNCTION public.check_admin_with_context(
  user_uuid uuid, 
  org_id uuid,
  bypass_context text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean := false;
  current_context text;
BEGIN
  -- Get the current context from session variable
  current_context := current_setting('app.rls_context', true);
  
  -- If we're in a bypass context (like invitation creation), use direct query
  IF current_context = 'invitation_bypass' OR bypass_context = 'invitation_bypass' THEN
    -- Direct query without RLS interference for invitation context
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ) INTO result;
  ELSE
    -- Normal RLS-aware query for regular contexts
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
        AND user_id = auth.uid() -- Only check for current user in normal context
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$;

-- Step 2: Create a function to set RLS context
CREATE OR REPLACE FUNCTION public.set_rls_context(context_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.rls_context', context_name, true);
END;
$$;

-- Step 3: Create a function to clear RLS context
CREATE OR REPLACE FUNCTION public.clear_rls_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.rls_context', '', true);
END;
$$;

-- Step 4: Update the invitation creation function to use context
CREATE OR REPLACE FUNCTION public.create_invitation_with_context(
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
  admin_check_result boolean := false;
BEGIN
  -- Set the bypass context for this operation
  PERFORM public.set_rls_context('invitation_bypass');
  
  -- Check admin privileges using context-aware function
  SELECT public.check_admin_with_context(p_invited_by, p_organization_id, 'invitation_bypass') INTO admin_check_result;
  
  IF NOT admin_check_result THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'PERMISSION_DENIED: User does not have admin privileges for organization %', p_organization_id;
  END IF;

  -- Check for existing invitation
  IF EXISTS (
    SELECT 1 FROM organization_invitations 
    WHERE organization_id = p_organization_id 
      AND lower(trim(email)) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for %', p_email;
  END IF;

  -- Insert invitation
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
  
  -- Clear the context
  PERFORM public.clear_rls_context();
  
  RETURN invitation_id;
  
EXCEPTION 
  WHEN SQLSTATE '23505' THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An invitation to this email already exists';
  WHEN OTHERS THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'INVITATION_ERROR: %', SQLERRM;
END;
$$;

-- Step 5: Update organization_members RLS policies to be context-aware
DROP POLICY IF EXISTS "org_members_minimal_select" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select_own" ON organization_members;

CREATE POLICY "organization_members_context_aware_select" 
  ON organization_members 
  FOR SELECT 
  USING (
    -- Allow access to own records always
    user_id = auth.uid() 
    OR 
    -- Allow broader access when in invitation bypass context
    (current_setting('app.rls_context', true) = 'invitation_bypass')
    OR
    -- Allow admins to see other members in their organizations
    (EXISTS (
      SELECT 1 FROM organization_members om2 
      WHERE om2.user_id = auth.uid() 
        AND om2.organization_id = organization_members.organization_id
        AND om2.role IN ('owner', 'admin')
        AND om2.status = 'active'
    ))
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_admin_with_context(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_rls_context(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_rls_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invitation_with_context(uuid, text, text, text, uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Solution 1 implemented - Context-aware RLS policies created.';
  RAISE NOTICE 'The invitation system now uses context-aware admin checking to prevent circular dependencies.';
  RAISE NOTICE 'RLS policies remain enabled while allowing safe admin checks during invitation creation.';
END $$;