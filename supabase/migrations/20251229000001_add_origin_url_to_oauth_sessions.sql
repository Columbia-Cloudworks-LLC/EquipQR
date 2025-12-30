-- Migration: Add origin_url to QuickBooks OAuth sessions
-- Description: Stores the user's origin URL so we can redirect back to the correct domain
-- Author: System
-- Date: 2025-12-29
--
-- This fixes an issue where users testing locally get redirected to production
-- after completing the QuickBooks OAuth flow.

-- ============================================================================
-- PART 1: Add origin_url column
-- ============================================================================

ALTER TABLE public.quickbooks_oauth_sessions 
ADD COLUMN IF NOT EXISTS origin_url TEXT;

COMMENT ON COLUMN public.quickbooks_oauth_sessions.origin_url IS 
    'The origin URL (e.g., http://localhost:5173 or https://equipqr.app) to redirect back to after OAuth completes.';

-- ============================================================================
-- PART 2: Update create_quickbooks_oauth_session function
-- ============================================================================

-- Drop old function signatures to avoid overloading confusion
DROP FUNCTION IF EXISTS public.create_quickbooks_oauth_session(UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_quickbooks_oauth_session(UUID, TEXT, TEXT);

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

COMMENT ON FUNCTION public.create_quickbooks_oauth_session(UUID, TEXT, TEXT) IS 
    'Creates a server-side OAuth session for QuickBooks connection. Returns session token to include in OAuth state. Validates user is admin/owner of organization.';

-- ============================================================================
-- PART 3: Update validate_quickbooks_oauth_session function
-- ============================================================================

-- Must DROP first because we're changing the return type (adding origin_url column)
DROP FUNCTION IF EXISTS public.validate_quickbooks_oauth_session(TEXT);

CREATE OR REPLACE FUNCTION public.validate_quickbooks_oauth_session(
  p_session_token TEXT
)
RETURNS TABLE(
  organization_id UUID,
  user_id UUID,
  nonce TEXT,
  redirect_url TEXT,
  origin_url TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Look up session
  SELECT 
    s.organization_id,
    s.user_id,
    s.nonce,
    s.redirect_url,
    s.origin_url,
    s.expires_at,
    s.used_at
  INTO v_session
  FROM public.quickbooks_oauth_sessions s
  WHERE s.session_token = p_session_token;

  -- Check if session exists
  IF v_session IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Check if session is expired
  IF v_session.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Check if session was already used (prevent replay attacks)
  IF v_session.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Mark session as used
  UPDATE public.quickbooks_oauth_sessions
  SET used_at = NOW()
  WHERE session_token = p_session_token;

  -- Return session data
  RETURN QUERY SELECT 
    v_session.organization_id,
    v_session.user_id,
    v_session.nonce,
    v_session.redirect_url,
    v_session.origin_url,
    true::BOOLEAN;
END;
$$;

COMMENT ON FUNCTION public.validate_quickbooks_oauth_session(TEXT) IS 
    'Validates and consumes an OAuth session token. Returns session data if valid, marks session as used to prevent replay attacks.';
