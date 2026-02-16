-- Migration: Self-service workspace admin verification
-- Description: Replaces manual approval workflow with automatic Google Workspace admin verification
-- Author: System
-- Date: 2026-01-20

-- =============================================================================
-- Drop obsolete objects related to manual approval workflow
-- =============================================================================

-- Drop RPCs for claim workflow
DROP FUNCTION IF EXISTS public.request_workspace_domain_claim(text);
DROP FUNCTION IF EXISTS public.request_workspace_domain_claim(text, uuid);
DROP FUNCTION IF EXISTS public.get_pending_workspace_claim_for_notification(text);
DROP FUNCTION IF EXISTS public.get_workspace_claim_notification_recipients(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_workspace_claim_notification(uuid, uuid);

-- Drop policies on workspace_domain_claims
DROP POLICY IF EXISTS workspace_domain_claims_select_own ON public.workspace_domain_claims;

-- Drop the workspace_domain_claims table
DROP TABLE IF EXISTS public.workspace_domain_claims;

-- =============================================================================
-- Update get_workspace_onboarding_state RPC
-- Simplified: returns only 'unclaimed' or 'claimed' domain_status
-- NOTE: Must DROP first because return type is changing (removing claim_status, claim_id)
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_workspace_onboarding_state(uuid);

CREATE FUNCTION public.get_workspace_onboarding_state(p_user_id uuid)
RETURNS TABLE(
  email text,
  domain text,
  domain_status text,
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
  v_workspace record;
  v_connected boolean := false;
BEGIN
  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  v_domain := split_part(public.normalize_email(v_email), '@', 2);

  -- Check if domain has a workspace_domains entry (claimed)
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
  workspace_org_id := v_workspace.organization_id;
  is_workspace_connected := v_connected;

  -- Simplified: only 'unclaimed' or 'claimed'
  IF v_workspace.organization_id IS NOT NULL THEN
    domain_status := 'claimed';
  ELSE
    domain_status := 'unclaimed';
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_workspace_onboarding_state(uuid) IS 
  'Returns workspace onboarding state for a user. Domain status is either unclaimed or claimed.';

-- =============================================================================
-- Update create_workspace_organization_for_domain RPC
-- Remove requirement for approved claim - allow any authenticated Google user
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_workspace_organization_for_domain(
  p_domain text,
  p_organization_name text
)
RETURNS TABLE(
  organization_id uuid,
  domain text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_domain text;
  v_org_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_domain := public.normalize_domain(p_domain);

  -- Block consumer domains
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  -- Check if domain already claimed
  IF EXISTS (
    SELECT 1 FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = v_domain
  ) THEN
    RAISE EXCEPTION 'Domain already claimed';
  END IF;

  -- Create the organization
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    p_organization_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  -- Create workspace_domains entry
  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id);

  organization_id := v_org_id;
  domain := v_domain;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.create_workspace_organization_for_domain(text, text) IS 
  'Creates a new organization for a Google Workspace domain. Called after Workspace admin verification in OAuth callback.';

-- =============================================================================
-- Update create_google_workspace_oauth_session RPC
-- Allow any authenticated user to start OAuth (admin check happens in callback)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_google_workspace_oauth_session(
  p_organization_id uuid DEFAULT NULL,
  p_redirect_url text DEFAULT NULL,
  p_origin_url text DEFAULT NULL
)
RETURNS TABLE(session_token text, nonce text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_session_token text;
  v_expires_at timestamptz;
  v_nonce text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create OAuth session';
  END IF;

  -- If organization_id provided, verify user is an admin/owner of that org
  -- (for reconnecting existing orgs)
  IF p_organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
        AND om.user_id = v_user_id
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Only organization administrators can connect Google Workspace';
    END IF;
  END IF;
  -- If no organization_id, allow any authenticated user to start OAuth
  -- The callback will verify they are a Workspace admin and create the org

  v_session_token := encode(gen_random_bytes(32), 'base64');
  v_nonce := encode(gen_random_bytes(16), 'hex');
  v_expires_at := now() + interval '1 hour';

  INSERT INTO public.google_workspace_oauth_sessions (
    session_token,
    organization_id,
    user_id,
    nonce,
    redirect_url,
    origin_url,
    expires_at
  ) VALUES (
    v_session_token,
    p_organization_id,  -- Can be NULL for first-time setup
    v_user_id,
    v_nonce,
    p_redirect_url,
    p_origin_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$$;

COMMENT ON FUNCTION public.create_google_workspace_oauth_session(uuid, text, text) IS 
  'Creates an OAuth session for Google Workspace connection. organization_id is optional for first-time setup.';

-- =============================================================================
-- Add auto_provision_workspace_organization RPC
-- Called from OAuth callback to atomically create org + workspace_domains
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_provision_workspace_organization(
  p_user_id uuid,
  p_domain text,
  p_organization_name text
)
RETURNS TABLE(
  organization_id uuid,
  domain text,
  already_existed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_org_id uuid;
  v_existing_org_id uuid;
BEGIN
  v_domain := public.normalize_domain(p_domain);

  -- Block consumer domains
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  -- Check if domain already has an organization
  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL THEN
    -- Domain already claimed, return existing org
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Create new organization
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    p_organization_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  -- Create workspace_domains entry
  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id);

  organization_id := v_org_id;
  domain := v_domain;
  already_existed := false;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) IS 
  'Atomically provisions a new organization for a Google Workspace domain. Called from OAuth callback after admin verification.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) TO service_role;

-- =============================================================================
-- Update grants for modified functions
-- =============================================================================

GRANT ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.create_workspace_organization_for_domain(text, text) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.create_google_workspace_oauth_session(uuid, text, text) TO authenticated, service_role;
