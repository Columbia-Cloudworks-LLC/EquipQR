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
CREATE INDEX IF NOT EXISTS idx_quickbooks_credentials_refresh_needed
    ON public.quickbooks_credentials(access_token_expires_at, organization_id)
    WHERE access_token_expires_at > NOW();

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.quickbooks_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Policy: SELECT - Organization members can view their org's QuickBooks credentials
-- Uses the optimized is_org_member pattern from existing codebase
CREATE POLICY "quickbooks_credentials_select_policy" 
ON public.quickbooks_credentials
FOR SELECT
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
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
