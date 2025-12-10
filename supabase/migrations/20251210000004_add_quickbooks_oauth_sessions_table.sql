-- Migration: Add QuickBooks OAuth sessions table
-- Description: Creates the quickbooks_oauth_sessions table that was missing from production
-- Author: System
-- Date: 2025-12-10
--
-- This migration adds the quickbooks_oauth_sessions table that should have been created
-- by PART 7 of 20251201000001_add_quickbooks_credentials.sql but was not applied to production.
--
-- The table stores OAuth sessions server-side to prevent state parameter tampering.
-- When generating OAuth URL, a session is created. The callback validates
-- the session exists and matches the user/organization before storing credentials.

-- ============================================================================
-- PART 1: Create OAuth session table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quickbooks_oauth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nonce TEXT NOT NULL,
    redirect_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for fast lookups by session token
    CONSTRAINT quickbooks_oauth_sessions_token_unique UNIQUE(session_token)
);

COMMENT ON TABLE public.quickbooks_oauth_sessions IS 
    'Stores OAuth sessions server-side to prevent state parameter tampering. Sessions expire after 1 hour and are single-use.';

COMMENT ON COLUMN public.quickbooks_oauth_sessions.session_token IS 
    'Random token included in OAuth state parameter. Used to look up session server-side.';

COMMENT ON COLUMN public.quickbooks_oauth_sessions.used_at IS 
    'Timestamp when session was consumed. Prevents replay attacks.';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index for session token lookups (partial index for unused sessions)
CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_token 
    ON public.quickbooks_oauth_sessions(session_token) 
    WHERE used_at IS NULL;

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_expires 
    ON public.quickbooks_oauth_sessions(expires_at);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.quickbooks_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Policy: SELECT - Only the user who created the session can view it
-- Note: If policy already exists, DROP it first to avoid conflicts
DROP POLICY IF EXISTS "quickbooks_oauth_sessions_select_policy" ON public.quickbooks_oauth_sessions;
CREATE POLICY "quickbooks_oauth_sessions_select_policy"
ON public.quickbooks_oauth_sessions
FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Policy: INSERT - Users can create sessions for their own user_id
-- SECURITY: This policy is defense-in-depth. Direct INSERT is revoked for authenticated role.
-- All session creation must go through create_quickbooks_oauth_session RPC which enforces admin/owner role.
DROP POLICY IF EXISTS "quickbooks_oauth_sessions_insert_policy" ON public.quickbooks_oauth_sessions;
CREATE POLICY "quickbooks_oauth_sessions_insert_policy"
ON public.quickbooks_oauth_sessions
FOR INSERT
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

-- Service role can access all sessions (for callback validation and RPC functions)
GRANT ALL ON public.quickbooks_oauth_sessions TO service_role;

-- SECURITY: Only grant SELECT for authenticated role. INSERT is revoked to prevent bypassing RPC function.
-- The create_quickbooks_oauth_session RPC uses SECURITY DEFINER so it can still insert via service_role.
GRANT SELECT ON public.quickbooks_oauth_sessions TO authenticated;

-- ============================================================================
-- PART 6: Create cleanup function for expired sessions
-- ============================================================================

-- Function to clean up expired sessions (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_quickbooks_oauth_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.quickbooks_oauth_sessions
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_quickbooks_oauth_sessions() IS 
    'Cleans up expired OAuth sessions older than 24 hours. Can be called periodically.';

