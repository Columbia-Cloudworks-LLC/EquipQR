-- Migration: Add QuickBooks credentials table for OAuth integration
-- Description: Creates table to store per-organization QuickBooks OAuth tokens
-- Author: System
-- Date: 2025-12-01

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

COMMENT ON COLUMN public.quickbooks_credentials.access_token_expires_at IS 
    'Timestamp when the access token expires. Refresh before this time.';

COMMENT ON COLUMN public.quickbooks_credentials.refresh_token_expires_at IS 
    'Timestamp when the refresh token expires. User must re-authorize after this.';

COMMENT ON COLUMN public.quickbooks_credentials.scopes IS 
    'Space-separated OAuth scopes granted by the user.';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index on organization_id for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_org 
    ON public.quickbooks_credentials(organization_id);

-- Index on access_token_expires_at for token refresh queries
CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_token_expiry 
    ON public.quickbooks_credentials(access_token_expires_at);

-- Composite index for finding credentials that need refresh
-- Note: This index supports queries that find tokens expiring soon (e.g., within 15 minutes).
-- The query should use: WHERE access_token_expires_at < (NOW() + INTERVAL '15 minutes')
-- We cannot use NOW() in a partial index WHERE clause because it's not IMMUTABLE,
-- so we index all rows and let the query filter at runtime.
CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_refresh_needed
    ON public.quickbooks_credentials(access_token_expires_at, organization_id);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.quickbooks_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Policy: SELECT - Only org admins/owners can view QuickBooks credentials
-- Security: Tokens are sensitive and should only be accessible to privileged users
-- Regular members can check connection status via a separate view/function if needed
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

-- Policy: INSERT - Only org admins/owners can add QuickBooks credentials
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

-- Policy: UPDATE - Only org admins/owners can update QuickBooks credentials
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

-- Policy: DELETE - Only org admins/owners can delete QuickBooks credentials
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

-- Create or replace trigger function to auto-update updated_at
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_quickbooks_credentials_updated_at ON public.quickbooks_credentials;
CREATE TRIGGER trigger_quickbooks_credentials_updated_at
    BEFORE UPDATE ON public.quickbooks_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quickbooks_credentials_updated_at();

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Grant usage to authenticated users (RLS will restrict access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quickbooks_credentials TO authenticated;

-- Grant full access to service role (bypasses RLS)
GRANT ALL ON public.quickbooks_credentials TO service_role;

-- ============================================================================
-- PART 7: Create OAuth session table for secure state validation
-- ============================================================================

-- This table stores OAuth sessions server-side to prevent state tampering
-- When generating OAuth URL, a session is created. The callback validates
-- the session exists and matches the user/organization before storing credentials.
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

-- Index for session token lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_token 
    ON public.quickbooks_oauth_sessions(session_token) 
    WHERE used_at IS NULL;

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_expires 
    ON public.quickbooks_oauth_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.quickbooks_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only the user who created the session can view it
CREATE POLICY "quickbooks_oauth_sessions_select_policy"
ON public.quickbooks_oauth_sessions
FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- RLS Policy: Users can create sessions for their own user_id
CREATE POLICY "quickbooks_oauth_sessions_insert_policy"
ON public.quickbooks_oauth_sessions
FOR INSERT
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
);

-- Service role can access all sessions (for callback validation)
GRANT ALL ON public.quickbooks_oauth_sessions TO service_role;
GRANT SELECT, INSERT ON public.quickbooks_oauth_sessions TO authenticated;

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
