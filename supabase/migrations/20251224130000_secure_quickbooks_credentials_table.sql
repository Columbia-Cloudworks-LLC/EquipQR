-- Migration: Secure QuickBooks credentials table access
-- Description: Revokes direct table access from authenticated users to prevent token exposure
-- Author: System
-- Date: 2025-12-24
--
-- SECURITY FIX: The previous migration's RLS policies allowed org admins to directly query
-- the quickbooks_credentials table and read sensitive access_token/refresh_token fields.
-- This migration revokes direct table access for authenticated/anon roles, ensuring that:
-- 1. Only service_role can directly access the table (used by Edge Functions)
-- 2. Authenticated users must use SECURITY DEFINER RPC functions (which don't expose tokens)
--
-- This addresses the security concern raised in PR review about potential token exfiltration
-- via XSS or malicious clients.

-- ============================================================================
-- PART 1: Revoke direct table access from authenticated and anon roles
-- ============================================================================

-- Revoke all privileges from authenticated role
-- Note: The default grants from ALTER DEFAULT PRIVILEGES give GRANT ALL to authenticated,
-- so we need to explicitly revoke them for this sensitive table.
REVOKE ALL ON public.quickbooks_credentials FROM authenticated;
REVOKE ALL ON public.quickbooks_credentials FROM anon;

-- ============================================================================
-- PART 2: Ensure only service_role has direct access
-- ============================================================================

-- Service role keeps full access (used by Edge Functions with SUPABASE_SERVICE_ROLE_KEY)
-- This was already granted in the previous migration, but we ensure it here for clarity
GRANT ALL ON public.quickbooks_credentials TO service_role;

-- ============================================================================
-- PART 3: Drop the now-unnecessary RLS policies
-- ============================================================================

-- Since authenticated users no longer have table-level grants, these RLS policies
-- are effectively unused. However, we keep RLS enabled as defense-in-depth.
-- The policies are kept as a safety net in case grants are accidentally restored.

-- Note: We intentionally keep the policies rather than dropping them because:
-- 1. Defense in depth - if someone accidentally grants access, RLS still protects
-- 2. The policies correctly restrict access to org admins/owners only
-- 3. Dropping and recreating them would add unnecessary churn

-- ============================================================================
-- PART 4: Add a comment explaining the security model
-- ============================================================================

COMMENT ON TABLE public.quickbooks_credentials IS 
    'Stores QuickBooks Online OAuth credentials per organization. SECURITY: Direct table access is REVOKED from authenticated/anon roles to prevent token exposure. All access must go through SECURITY DEFINER RPC functions (get_quickbooks_connection_status, disconnect_quickbooks) which only expose non-sensitive metadata. Only service_role (Edge Functions) can directly read/write tokens.';

-- ============================================================================
-- PART 5: Verify the security model is correct
-- ============================================================================

-- This DO block verifies that authenticated users cannot select from the table
-- It will raise a notice (not an error) if the revoke was successful
DO $$
BEGIN
  -- Check that authenticated role has no privileges on the table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
    AND table_name = 'quickbooks_credentials'
    AND grantee = 'authenticated'
  ) THEN
    RAISE WARNING 'Security check failed: authenticated role still has privileges on quickbooks_credentials';
  ELSE
    RAISE NOTICE 'Security check passed: authenticated role has no direct access to quickbooks_credentials';
  END IF;
END $$;

