-- Migration: Google Workspace improvements
-- Description: Adds NULL handling, clarifying comments, and documentation for previous migration
-- Author: System
-- Date: 2026-01-19

-- =============================================================================
-- Improve normalize functions to handle NULL inputs gracefully
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Return NULL for NULL input to prevent errors in queries
  IF p_email IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(p_email));
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_domain(p_domain text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Return NULL for NULL input to prevent errors in queries
  IF p_domain IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(p_domain));
END;
$$;

-- =============================================================================
-- Add clarifying comments for table constraints and design decisions
-- =============================================================================

-- The personal_organizations table uses a two-constraint design:
-- 1. user_id is the PRIMARY KEY - ensures each user has at most ONE personal org
-- 2. organization_id has a UNIQUE constraint - ensures each org is personal for at most ONE user
-- Together these create a strict 1:1 mapping between users and their personal organizations.
COMMENT ON TABLE public.personal_organizations IS 'Maps users to their personal (default) organization. The user_id primary key ensures one personal org per user, while the unique constraint on organization_id ensures each organization can only be designated as personal for one user. This creates a strict 1:1 mapping.';

COMMENT ON INDEX public.personal_organizations_org_unique IS 'Ensures each organization can only be the personal organization for one user.';

-- =============================================================================
-- Add documentation about OAuth session cleanup
-- =============================================================================

-- Note: The google_workspace_oauth_sessions table stores short-lived CSRF tokens.
-- Sessions expire after 1 hour (set in create_google_workspace_oauth_session).
-- A scheduled cleanup job should be implemented to delete expired sessions.
-- Example cleanup query (run via pg_cron or external scheduler):
--   DELETE FROM google_workspace_oauth_sessions WHERE expires_at < now() - interval '1 day';

COMMENT ON TABLE public.google_workspace_oauth_sessions IS 'OAuth CSRF protection sessions. Sessions expire after 1 hour and should be cleaned up by a scheduled job. Clients cannot read/update/delete directly; only SECURITY DEFINER RPCs and service_role can manage these rows. TODO: Implement pg_cron job or external scheduler to delete expired sessions.';

-- =============================================================================
-- Add documentation about transaction behavior
-- =============================================================================

COMMENT ON FUNCTION public.select_google_workspace_members(uuid, text[], text[]) IS 'Selects Google Workspace users as organization members and optionally grants admin roles. This function runs as a single database transaction (PL/pgSQL functions are transactional by default), ensuring atomicity: either all operations succeed or the entire function rolls back. Race conditions between membership creation and admin grant application are prevented by this transactional behavior - no explicit transaction wrapper is needed.';

-- =============================================================================
-- Improve get_workspace_onboarding_state to always return a row
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_workspace_onboarding_state(p_user_id uuid)
RETURNS TABLE(
  email text,
  domain text,
  domain_status text,
  claim_status text,
  claim_id uuid,
  workspace_org_id uuid,
  is_workspace_connected boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_domain text;
  v_claim record;
  v_workspace record;
  v_connected boolean := false;
BEGIN
  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  -- Always return a row, even if user not found (with NULLs)
  IF v_email IS NULL THEN
    email := NULL;
    domain := NULL;
    domain_status := NULL;
    claim_status := NULL;
    claim_id := NULL;
    workspace_org_id := NULL;
    is_workspace_connected := false;
    RETURN NEXT;
    RETURN;
  END IF;

  v_domain := split_part(public.normalize_email(v_email), '@', 2);

  SELECT c.*
  INTO v_claim
  FROM public.workspace_domain_claims c
  WHERE public.normalize_domain(c.domain) = public.normalize_domain(v_domain)
  ORDER BY c.requested_at DESC
  LIMIT 1;

  SELECT d.organization_id
  INTO v_workspace
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = public.normalize_domain(v_domain);

  IF v_workspace.organization_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.google_workspace_credentials gwc
      WHERE gwc.organization_id = v_workspace.organization_id
        AND public.normalize_domain(gwc.domain) = public.normalize_domain(v_domain)
    ) INTO v_connected;
  END IF;

  email := v_email;
  domain := v_domain;
  claim_id := CASE WHEN v_claim IS NOT NULL THEN v_claim.id ELSE NULL END;
  claim_status := CASE WHEN v_claim IS NOT NULL THEN v_claim.status ELSE NULL END;
  workspace_org_id := v_workspace.organization_id;
  is_workspace_connected := v_connected;

  IF v_workspace.organization_id IS NOT NULL THEN
    domain_status := 'claimed';
  ELSIF v_claim IS NOT NULL AND v_claim.status = 'approved' THEN
    domain_status := 'approved';
  ELSIF v_claim IS NOT NULL AND v_claim.status = 'pending' THEN
    domain_status := 'pending';
  ELSE
    domain_status := 'unclaimed';
  END IF;

  RETURN NEXT;
END;
$$;
