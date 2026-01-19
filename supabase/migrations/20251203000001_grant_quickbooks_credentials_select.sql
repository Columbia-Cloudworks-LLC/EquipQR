-- Migration: Grant SELECT and DELETE permissions to authenticated role for QuickBooks credentials
-- Description: Allows authenticated users to check connection status and disconnect while maintaining security
-- Author: System
-- Date: 2025-12-03

-- ============================================================================
-- SECURITY NOTE: Granting SELECT and DELETE to authenticated role
-- ============================================================================
-- 
-- This migration grants SELECT and DELETE permissions to authenticated users to enable:
-- 1. Frontend to check QuickBooks connection status via getConnectionStatus()
-- 2. Frontend to disconnect QuickBooks via disconnectQuickBooks()
-- 
-- Security protections:
-- 1. RLS policies restrict SELECT and DELETE to admin/owner users only (see existing policies)
-- 2. Frontend only selects non-sensitive fields (realm_id, expiration dates, scopes, created_at)
-- 3. Sensitive fields (access_token, refresh_token) are never selected by frontend
-- 4. INSERT and UPDATE remain restricted to service_role only
-- 5. All credential creation/modification must go through Edge Functions using service_role
--
-- This allows the UI to:
-- - Display connection status (connected/disconnected)
-- - Show token expiration information
-- - Enable/disable QuickBooks features based on connection
-- - Disconnect QuickBooks (admin/owner only, enforced by RLS)
--
-- Without exposing sensitive tokens or allowing unauthorized credential creation/modification.

-- Grant SELECT to authenticated role (RLS policy will enforce admin/owner restriction)
GRANT SELECT ON public.quickbooks_credentials TO authenticated;

-- Grant DELETE to authenticated role (RLS policy will enforce admin/owner restriction)
-- This allows admin/owner users to disconnect QuickBooks via the UI
GRANT DELETE ON public.quickbooks_credentials TO authenticated;

-- Note: INSERT and UPDATE remain restricted to service_role only
-- This ensures all credential creation/modification goes through secure Edge Functions

