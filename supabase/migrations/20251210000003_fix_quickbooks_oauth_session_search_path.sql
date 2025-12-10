-- Migration: Fix QuickBooks OAuth session RPC function search_path
-- Description: Adds extensions schema to search_path so gen_random_bytes() from pgcrypto is accessible
-- Author: System
-- Date: 2025-12-10
--
-- This migration fixes the create_quickbooks_oauth_session function that was failing with:
-- "function gen_random_bytes(integer) does not exist"
--
-- The issue was that the function had SET search_path = public, but gen_random_bytes()
-- from the pgcrypto extension is in the extensions schema.

-- ============================================================================
-- PART 1: Recreate create_quickbooks_oauth_session with corrected search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_quickbooks_oauth_session(
  p_organization_id UUID,
  p_redirect_url TEXT DEFAULT NULL
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

  -- Validate user is admin/owner (only admins can connect QuickBooks)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can connect QuickBooks';
  END IF;

  -- Generate session token (32 random bytes, base64 encoded = 44 chars)
  -- gen_random_bytes() is from pgcrypto extension in extensions schema
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
    expires_at
  ) VALUES (
    v_session_token,
    p_organization_id,
    v_user_id,
    v_nonce,
    p_redirect_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$$;

COMMENT ON FUNCTION public.create_quickbooks_oauth_session(UUID, TEXT) IS 
    'Creates a server-side OAuth session for QuickBooks connection. Returns session token to include in OAuth state. Validates user is admin/owner of organization.';

