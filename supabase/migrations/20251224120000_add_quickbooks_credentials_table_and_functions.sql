-- Migration: Add complete QuickBooks credentials infrastructure
-- Description: Creates credentials table and secure RPC functions for QuickBooks OAuth
-- Author: System  
-- Date: 2024-12-24
--
-- This migration adds the missing quickbooks_credentials table and related functions
-- that were not properly applied in previous migrations due to timestamp ordering issues.

-- ============================================================================
-- PART 1: Create quickbooks_credentials table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quickbooks_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    realm_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token_expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT NOT NULL DEFAULT 'com.intuit.quickbooks.accounting',
    token_type TEXT NOT NULL DEFAULT 'bearer',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure each organization can only have one connection per QuickBooks company (realm)
    UNIQUE(organization_id, realm_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.quickbooks_credentials IS 
    'Stores QuickBooks Online OAuth credentials per organization. Each org can connect to one or more QuickBooks companies (realms).';

COMMENT ON COLUMN public.quickbooks_credentials.realm_id IS 
    'QuickBooks company ID (realmId) - identifies the QuickBooks company connected to this organization';

COMMENT ON COLUMN public.quickbooks_credentials.access_token IS 
    'OAuth access token - valid for 60 minutes. Used for API requests.';

COMMENT ON COLUMN public.quickbooks_credentials.refresh_token IS 
    'OAuth refresh token - valid for 100 days. Used to obtain new access tokens.';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_org 
    ON public.quickbooks_credentials(organization_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_token_expiry 
    ON public.quickbooks_credentials(access_token_expires_at);

CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_refresh_needed
    ON public.quickbooks_credentials(access_token_expires_at, organization_id);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.quickbooks_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "quickbooks_credentials_select_policy" ON public.quickbooks_credentials;
DROP POLICY IF EXISTS "quickbooks_credentials_insert_policy" ON public.quickbooks_credentials;
DROP POLICY IF EXISTS "quickbooks_credentials_update_policy" ON public.quickbooks_credentials;
DROP POLICY IF EXISTS "quickbooks_credentials_delete_policy" ON public.quickbooks_credentials;

-- Policy: SELECT - Service-role only (authenticated users have no SELECT grant)
CREATE POLICY "quickbooks_credentials_select_policy" 
ON public.quickbooks_credentials
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_credentials.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: INSERT - Service-role only
CREATE POLICY "quickbooks_credentials_insert_policy"
ON public.quickbooks_credentials
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_credentials.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: UPDATE - Service-role only
CREATE POLICY "quickbooks_credentials_update_policy"
ON public.quickbooks_credentials
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_credentials.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_credentials.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: DELETE - Service-role only
CREATE POLICY "quickbooks_credentials_delete_policy"
ON public.quickbooks_credentials
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_credentials.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- ============================================================================
-- PART 5: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_quickbooks_credentials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_quickbooks_credentials_updated_at ON public.quickbooks_credentials;
CREATE TRIGGER trigger_quickbooks_credentials_updated_at
    BEFORE UPDATE ON public.quickbooks_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quickbooks_credentials_updated_at();

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Service role gets full access (bypasses RLS)
GRANT ALL ON public.quickbooks_credentials TO service_role;

-- ============================================================================
-- PART 7: Create RPC function to get connection status (non-sensitive data only)
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
-- PART 8: Create RPC function to disconnect QuickBooks
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
-- PART 9: Grant EXECUTE permissions on RPC functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_quickbooks_connection_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_quickbooks(UUID, TEXT) TO authenticated;

