-- Migration: Secure QuickBooks credentials access via RPC functions
-- Description: Revokes direct table access and provides secure RPC functions for UI operations
-- Author: System
-- Date: 2025-12-10
--
-- SECURITY FIX: This migration addresses a security vulnerability where granting SELECT
-- on quickbooks_credentials to authenticated role exposed raw OAuth tokens to browser clients.
-- 
-- Changes:
-- 1. Revoke SELECT and DELETE grants from authenticated role
-- 2. Create RPC function to get connection status (non-sensitive metadata only)
-- 3. Create RPC function to disconnect QuickBooks (with proper authorization)

-- ============================================================================
-- PART 1: Revoke direct table access from authenticated role
-- ============================================================================

-- Revoke SELECT - prevents browser-based clients from querying credentials table
REVOKE SELECT ON public.quickbooks_credentials FROM authenticated;

-- Revoke DELETE - prevents direct deletion, must go through RPC function
REVOKE DELETE ON public.quickbooks_credentials FROM authenticated;

-- ============================================================================
-- PART 2: Create RPC function to get connection status (non-sensitive data only)
-- ============================================================================

-- This function returns only non-sensitive metadata about the QuickBooks connection
-- Does NOT return access_token or refresh_token
-- Executes with SECURITY DEFINER to bypass RLS using service_role privileges
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

  -- Validate user is admin/owner (only admins can view connection status)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can view QuickBooks connection status';
  END IF;

  -- Query credentials (using SECURITY DEFINER to bypass RLS)
  -- Use ORDER BY to ensure deterministic results (most recent credentials)
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

COMMENT ON FUNCTION public.get_quickbooks_connection_status(UUID) IS 
    'Returns non-sensitive QuickBooks connection metadata for an organization. Only admin/owner can access. Does NOT expose OAuth tokens.';

-- ============================================================================
-- PART 3: Create RPC function to disconnect QuickBooks
-- ============================================================================

-- This function allows admin/owner to disconnect QuickBooks by deleting credentials
-- Executes with SECURITY DEFINER to bypass RLS using service_role privileges
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

  -- Validate user is admin/owner (only admins can disconnect QuickBooks)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can disconnect QuickBooks';
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

COMMENT ON FUNCTION public.disconnect_quickbooks(UUID, TEXT) IS 
    'Disconnects QuickBooks by deleting credentials for an organization. Only admin/owner can disconnect. Optionally specify realm_id to disconnect specific connection.';

-- ============================================================================
-- PART 4: Grant EXECUTE permissions on RPC functions
-- ============================================================================

-- Grant execute on connection status function to authenticated users
-- Authorization is enforced within the function
GRANT EXECUTE ON FUNCTION public.get_quickbooks_connection_status(UUID) TO authenticated;

-- Grant execute on disconnect function to authenticated users
-- Authorization is enforced within the function
GRANT EXECUTE ON FUNCTION public.disconnect_quickbooks(UUID, TEXT) TO authenticated;
