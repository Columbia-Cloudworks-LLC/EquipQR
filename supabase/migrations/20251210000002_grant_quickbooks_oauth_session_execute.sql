-- Migration: Grant EXECUTE permissions on QuickBooks OAuth session RPC functions
-- Description: Grants EXECUTE permission to authenticated role for OAuth session functions
-- Author: System
-- Date: 2025-12-10
--
-- This migration fixes the missing EXECUTE permissions that prevent authenticated users
-- from calling create_quickbooks_oauth_session and validate_quickbooks_oauth_session.
-- 
-- The functions were created in 20251201000003_add_quickbooks_oauth_session_rpc.sql
-- but EXECUTE permissions were never granted to the authenticated role.
-- Even though the functions use SECURITY DEFINER, users still need EXECUTE permission
-- to call them via RPC.

-- ============================================================================
-- Grant EXECUTE permissions on OAuth session RPC functions
-- ============================================================================

-- Grant execute on create_quickbooks_oauth_session function to authenticated users
-- Authorization is enforced within the function (admin/owner checks)
GRANT EXECUTE ON FUNCTION public.create_quickbooks_oauth_session(UUID, TEXT) TO authenticated;

-- Grant execute on validate_quickbooks_oauth_session function to authenticated users
-- This function is called by the OAuth callback edge function, but may also be called
-- by authenticated clients for validation purposes
GRANT EXECUTE ON FUNCTION public.validate_quickbooks_oauth_session(TEXT) TO authenticated;

