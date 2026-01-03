-- Migration: Add can_manage_quickbooks permission flag to organization_members
-- Description: Allows owners to grant QuickBooks management to specific admins
-- Author: System
-- Date: 2026-01-03
--
-- By default, only owners can manage QuickBooks. Owners can optionally grant
-- this permission to admins via the can_manage_quickbooks flag.

-- ============================================================================
-- PART 1: Add can_manage_quickbooks column to organization_members
-- ============================================================================

ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS can_manage_quickbooks BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organization_members.can_manage_quickbooks IS 
    'Whether this member can manage QuickBooks integration. Owners always have this permission. Admins must be explicitly granted it by an owner. Members cannot have this permission.';

-- ============================================================================
-- PART 2: Create helper function to check QuickBooks management permission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_user_manage_quickbooks(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_can_manage BOOLEAN;
BEGIN
  -- Get user's membership info
  SELECT role, can_manage_quickbooks
  INTO v_role, v_can_manage
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  -- No membership found
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Owners always have permission
  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Admins need explicit permission
  IF v_role = 'admin' AND v_can_manage = true THEN
    RETURN true;
  END IF;

  -- Members and admins without explicit permission cannot manage QuickBooks
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_user_manage_quickbooks(UUID, UUID) IS 
    'Checks if a user can manage QuickBooks for an organization. Owners always can. Admins only if can_manage_quickbooks flag is true.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_user_manage_quickbooks(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_manage_quickbooks(UUID, UUID) TO service_role;

-- ============================================================================
-- PART 3: Update get_quickbooks_connection_status to use new permission check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_quickbooks_connection_status(
  p_organization_id UUID
)
RETURNS TABLE(
  is_connected BOOLEAN,
  realm_id TEXT,
  connected_at TIMESTAMPTZ,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  is_access_token_valid BOOLEAN,
  is_refresh_token_valid BOOLEAN,
  scopes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_credentials RECORD;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;

  -- Validate user has QuickBooks management permission
  IF NOT public.can_user_manage_quickbooks(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'You do not have permission to view QuickBooks connection status';
  END IF;

  -- Query credentials (using SECURITY DEFINER to bypass RLS)
  SELECT 
    qc.realm_id,
    qc.created_at,
    qc.access_token_expires_at,
    qc.refresh_token_expires_at,
    qc.scopes
  INTO v_credentials
  FROM public.quickbooks_credentials qc
  WHERE qc.organization_id = p_organization_id
  ORDER BY qc.created_at DESC
  LIMIT 1;

  -- If no credentials found, return not connected
  IF v_credentials IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      false::BOOLEAN,
      false::BOOLEAN,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Return connection status with non-sensitive metadata
  RETURN QUERY SELECT 
    true::BOOLEAN,
    v_credentials.realm_id,
    v_credentials.created_at,
    v_credentials.access_token_expires_at,
    v_credentials.refresh_token_expires_at,
    (v_credentials.access_token_expires_at > NOW())::BOOLEAN,
    (v_credentials.refresh_token_expires_at > NOW())::BOOLEAN,
    v_credentials.scopes;
END;
$$;

-- ============================================================================
-- PART 4: Update disconnect_quickbooks to use new permission check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.disconnect_quickbooks(
  p_organization_id UUID,
  p_realm_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;

  -- Validate user has QuickBooks management permission
  IF NOT public.can_user_manage_quickbooks(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'You do not have permission to disconnect QuickBooks';
  END IF;

  -- Delete credentials (using SECURITY DEFINER to bypass RLS)
  IF p_realm_id IS NOT NULL THEN
    -- Delete specific realm
    DELETE FROM public.quickbooks_credentials
    WHERE organization_id = p_organization_id
    AND realm_id = p_realm_id;
  ELSE
    -- Delete all credentials for organization
    DELETE FROM public.quickbooks_credentials
    WHERE organization_id = p_organization_id;
  END IF;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN QUERY SELECT false::BOOLEAN, 'No QuickBooks connection found to disconnect'::TEXT;
  ELSE
    RETURN QUERY SELECT true::BOOLEAN, 'QuickBooks disconnected successfully'::TEXT;
  END IF;
END;
$$;

-- ============================================================================
-- PART 5: Update create_quickbooks_oauth_session to use new permission check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_quickbooks_oauth_session(
  p_organization_id UUID,
  p_redirect_url TEXT DEFAULT NULL,
  p_origin_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  session_token TEXT,
  nonce TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_nonce TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create OAuth session';
  END IF;

  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;

  -- Validate user has QuickBooks management permission
  IF NOT public.can_user_manage_quickbooks(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'You do not have permission to connect QuickBooks';
  END IF;

  -- Generate session token (32 random bytes, base64 encoded = 44 chars)
  v_session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Generate nonce for CSRF protection
  v_nonce := encode(gen_random_bytes(16), 'hex');
  
  -- Session expires in 1 hour
  v_expires_at := NOW() + INTERVAL '1 hour';

  -- Insert session
  INSERT INTO public.quickbooks_oauth_sessions (
    session_token,
    organization_id,
    user_id,
    nonce,
    redirect_url,
    origin_url,
    expires_at
  ) VALUES (
    v_session_token,
    p_organization_id,
    v_user_id,
    v_nonce,
    p_redirect_url,
    p_origin_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$$;

-- ============================================================================
-- PART 6: Create RPC to update QuickBooks permission (owner only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_member_quickbooks_permission(
  p_organization_id UUID,
  p_target_user_id UUID,
  p_can_manage_quickbooks BOOLEAN
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM public.organization_members
  WHERE user_id = v_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  -- Only owners can change QuickBooks permissions
  IF v_caller_role IS NULL OR v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only organization owners can change QuickBooks permissions';
  END IF;

  -- Get target's role
  SELECT role INTO v_target_role
  FROM public.organization_members
  WHERE user_id = p_target_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this organization';
  END IF;

  -- Can't change owner's permission (they always have it)
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change QuickBooks permission for organization owner';
  END IF;

  -- Can only grant to admins
  IF v_target_role != 'admin' THEN
    RAISE EXCEPTION 'QuickBooks management can only be granted to admins';
  END IF;

  -- Update the permission
  UPDATE public.organization_members
  SET can_manage_quickbooks = p_can_manage_quickbooks,
      updated_at = NOW()
  WHERE user_id = p_target_user_id
    AND organization_id = p_organization_id;

  IF p_can_manage_quickbooks THEN
    RETURN QUERY SELECT true::BOOLEAN, 'QuickBooks management permission granted'::TEXT;
  ELSE
    RETURN QUERY SELECT true::BOOLEAN, 'QuickBooks management permission revoked'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_member_quickbooks_permission(UUID, UUID, BOOLEAN) IS 
    'Updates the can_manage_quickbooks flag for an organization member. Only owners can call this, and it only applies to admins.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_member_quickbooks_permission(UUID, UUID, BOOLEAN) TO authenticated;

-- ============================================================================
-- PART 7: Create RPC to get user's QuickBooks permission status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_quickbooks_permission(
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.can_user_manage_quickbooks(v_user_id, p_organization_id);
END;
$$;

COMMENT ON FUNCTION public.get_user_quickbooks_permission(UUID) IS 
    'Returns whether the current user can manage QuickBooks for the specified organization.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_quickbooks_permission(UUID) TO authenticated;
