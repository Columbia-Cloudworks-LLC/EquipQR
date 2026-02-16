-- Migration: Fix google_workspace_oauth_sessions organization_id to allow NULL
-- Description: Allow NULL organization_id for first-time workspace setup
-- Author: System
-- Date: 2026-01-22
-- 
-- ISSUE: Migration 20260120100000_self_service_workspace_admin updated the 
-- create_google_workspace_oauth_session RPC to allow NULL organization_id for 
-- first-time workspace setup, but the table column remained NOT NULL.
-- This caused: "null value in column 'organization_id' violates not-null constraint"
--
-- DOWN MIGRATION (revert):
-- ALTER TABLE public.google_workspace_oauth_sessions ALTER COLUMN organization_id SET NOT NULL;
-- (Note: Only if all rows have non-null organization_id)

-- =============================================================================
-- Make organization_id nullable for first-time workspace setup
-- =============================================================================

ALTER TABLE public.google_workspace_oauth_sessions 
  ALTER COLUMN organization_id DROP NOT NULL;

COMMENT ON COLUMN public.google_workspace_oauth_sessions.organization_id IS 
  'Organization ID. NULL for first-time workspace setup when organization does not yet exist. Set after OAuth callback creates the organization.';

-- =============================================================================
-- Update RLS INSERT policy to allow inserts with NULL organization_id
-- The SECURITY DEFINER function bypasses RLS, but we update the policy
-- for consistency and to document the intended behavior.
-- =============================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS google_workspace_oauth_sessions_insert 
  ON public.google_workspace_oauth_sessions;

-- Create new insert policy that allows NULL organization_id for first-time setup
-- The user must be authenticated (user_id = auth.uid())
-- If organization_id IS NULL: allowed (first-time setup, SECURITY DEFINER function handles this)
-- If organization_id IS NOT NULL: user must be admin/owner of that org
CREATE POLICY google_workspace_oauth_sessions_insert
  ON public.google_workspace_oauth_sessions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Allow NULL organization_id for first-time setup
      organization_id IS NULL
      OR
      -- For existing orgs, user must be admin/owner
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
          AND om.status = 'active'
      )
    )
  );

COMMENT ON POLICY google_workspace_oauth_sessions_insert 
  ON public.google_workspace_oauth_sessions IS 
  'Allow authenticated users to create OAuth sessions. NULL organization_id for first-time setup, or admin/owner of existing org.';
