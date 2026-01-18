-- Migration: Google Workspace onboarding + import
-- Description: Domain claim flow, OAuth session storage, directory cache, member claims, pending role grants
-- Author: System
-- Date: 2026-01-18

-- =============================================================================
-- Helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(p_email));
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_domain(p_domain text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(p_domain));
END;
$$;

-- Returns true when a user has a Google OAuth identity.
CREATE OR REPLACE FUNCTION public.is_user_google_oauth_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_google_identity boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u,
      LATERAL jsonb_array_elements(COALESCE(u.identities, '[]'::jsonb)) AS ident
    WHERE u.id = p_user_id
      AND ident->>'provider' = 'google'
  )
  INTO has_google_identity;

  RETURN has_google_identity;
END;
$$;

COMMENT ON FUNCTION public.is_user_google_oauth_verified(uuid) IS
'Returns true if the user has a Google OAuth identity. Used to gate admin grants.';

-- =============================================================================
-- Domain claim + mapping
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_domain_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  domain text NOT NULL,
  requested_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by_user_id uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  CONSTRAINT workspace_domain_claims_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_domain_claims_unique_active
  ON public.workspace_domain_claims (public.normalize_domain(domain))
  WHERE status IN ('pending', 'approved');

CREATE TABLE IF NOT EXISTS public.workspace_domains (
  domain text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- OAuth sessions + credentials
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.google_workspace_oauth_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  redirect_url text,
  origin_url text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS google_workspace_oauth_sessions_token
  ON public.google_workspace_oauth_sessions (session_token);

CREATE TABLE IF NOT EXISTS public.google_workspace_credentials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  customer_id text,
  refresh_token text NOT NULL,
  access_token_expires_at timestamptz NOT NULL,
  scopes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS google_workspace_credentials_org_domain
  ON public.google_workspace_credentials (organization_id, public.normalize_domain(domain));

-- =============================================================================
-- Directory cache
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.google_workspace_directory_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  google_user_id text NOT NULL,
  primary_email text NOT NULL,
  full_name text,
  given_name text,
  family_name text,
  suspended boolean DEFAULT false NOT NULL,
  org_unit_path text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS google_workspace_directory_users_unique
  ON public.google_workspace_directory_users (organization_id, google_user_id);

CREATE INDEX IF NOT EXISTS google_workspace_directory_users_email
  ON public.google_workspace_directory_users (organization_id, public.normalize_email(primary_email));

-- =============================================================================
-- Membership claims + pending admin grants
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_member_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'google_workspace'::text,
  status text NOT NULL DEFAULT 'selected'::text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  claimed_user_id uuid REFERENCES auth.users(id),
  claimed_at timestamptz,
  CONSTRAINT organization_member_claims_status_check
    CHECK (status = ANY (ARRAY['selected'::text, 'claimed'::text, 'revoked'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_member_claims_unique_active
  ON public.organization_member_claims (organization_id, public.normalize_email(email))
  WHERE status IN ('selected', 'claimed');

CREATE INDEX IF NOT EXISTS organization_member_claims_email
  ON public.organization_member_claims (public.normalize_email(email));

CREATE TABLE IF NOT EXISTS public.organization_role_grants_pending (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  desired_role text NOT NULL DEFAULT 'admin'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  applied_user_id uuid REFERENCES auth.users(id),
  applied_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT organization_role_grants_pending_role_check
    CHECK (desired_role = 'admin'),
  CONSTRAINT organization_role_grants_pending_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'applied'::text, 'revoked'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_role_grants_pending_unique
  ON public.organization_role_grants_pending (organization_id, public.normalize_email(email))
  WHERE status = 'pending';

-- =============================================================================
-- Personal organization mapping (idempotent personal org creation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.personal_organizations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS personal_organizations_org_unique
  ON public.personal_organizations (organization_id);

-- =============================================================================
-- RPCs: onboarding state, claims, org creation
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

  IF v_email IS NULL THEN
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
  claim_id := v_claim.id;
  claim_status := v_claim.status;
  workspace_org_id := v_workspace.organization_id;
  is_workspace_connected := v_connected;

  IF v_workspace.organization_id IS NOT NULL THEN
    domain_status := 'claimed';
  ELSIF v_claim.status = 'approved' THEN
    domain_status := 'approved';
  ELSIF v_claim.status = 'pending' THEN
    domain_status := 'pending';
  ELSE
    domain_status := 'unclaimed';
  END IF;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_workspace_domain_claim(p_domain text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_domain text;
  v_claim_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_domain := public.normalize_domain(p_domain);

  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = v_domain
  ) THEN
    RAISE EXCEPTION 'Domain already claimed';
  END IF;

  INSERT INTO public.workspace_domain_claims (
    domain,
    requested_by_user_id,
    status
  ) VALUES (
    v_domain,
    v_user_id,
    'pending'
  ) RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;

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
  v_claim record;
  v_org_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_domain := public.normalize_domain(p_domain);

  SELECT *
  INTO v_claim
  FROM public.workspace_domain_claims c
  WHERE public.normalize_domain(c.domain) = v_domain
    AND c.status = 'approved'
  ORDER BY c.requested_at DESC
  LIMIT 1;

  IF v_claim.id IS NULL THEN
    RAISE EXCEPTION 'Domain is not approved for onboarding';
  END IF;

  IF v_claim.requested_by_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the requester can create the workspace organization';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = v_domain
  ) THEN
    RAISE EXCEPTION 'Domain already claimed';
  END IF;

  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    p_organization_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id);

  organization_id := v_org_id;
  domain := v_domain;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- RPCs: OAuth session creation/validation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_google_workspace_oauth_session(
  p_organization_id uuid,
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

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can connect Google Workspace';
  END IF;

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
    p_organization_id,
    v_user_id,
    v_nonce,
    p_redirect_url,
    p_origin_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_google_workspace_oauth_session(
  p_session_token text
)
RETURNS TABLE(
  organization_id uuid,
  user_id uuid,
  nonce text,
  redirect_url text,
  origin_url text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
BEGIN
  SELECT
    s.organization_id,
    s.user_id,
    s.nonce,
    s.redirect_url,
    s.origin_url,
    s.expires_at,
    s.used_at
  INTO v_session
  FROM public.google_workspace_oauth_sessions s
  WHERE s.session_token = p_session_token;

  IF v_session IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, false::boolean;
    RETURN;
  END IF;

  IF v_session.used_at IS NOT NULL OR v_session.expires_at < now() THEN
    RETURN QUERY SELECT v_session.organization_id, v_session.user_id, v_session.nonce, v_session.redirect_url, v_session.origin_url, false::boolean;
    RETURN;
  END IF;

  UPDATE public.google_workspace_oauth_sessions
  SET used_at = now()
  WHERE session_token = p_session_token;

  RETURN QUERY SELECT v_session.organization_id, v_session.user_id, v_session.nonce, v_session.redirect_url, v_session.origin_url, true::boolean;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_google_workspace_connection_status(
  p_organization_id uuid
)
RETURNS TABLE(
  is_connected boolean,
  domain text,
  connected_at timestamptz,
  access_token_expires_at timestamptz,
  scopes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_credentials record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can view Google Workspace connection';
  END IF;

  SELECT
    gwc.domain,
    gwc.created_at,
    gwc.access_token_expires_at,
    gwc.scopes
  INTO v_credentials
  FROM public.google_workspace_credentials gwc
  WHERE gwc.organization_id = p_organization_id
  ORDER BY gwc.created_at DESC
  LIMIT 1;

  IF v_credentials IS NULL THEN
    RETURN QUERY SELECT false::boolean, NULL::text, NULL::timestamptz, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true::boolean, v_credentials.domain, v_credentials.created_at, v_credentials.access_token_expires_at, v_credentials.scopes;
END;
$$;

-- =============================================================================
-- RPCs: selective import + pending admin grants
-- =============================================================================

CREATE OR REPLACE FUNCTION public.select_google_workspace_members(
  p_organization_id uuid,
  p_emails text[],
  p_admin_emails text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_member_count int := 0;
  v_admin_applied int := 0;
  v_admin_pending int := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can add members';
  END IF;

  -- Insert member claims
  INSERT INTO public.organization_member_claims (
    organization_id, email, source, status, created_by
  )
  SELECT
    p_organization_id,
    public.normalize_email(e),
    'google_workspace',
    'selected',
    v_user_id
  FROM unnest(p_emails) AS e
  ON CONFLICT (organization_id, email) DO UPDATE
    SET status = 'selected',
        created_by = EXCLUDED.created_by,
        created_at = now();

  -- Create memberships immediately for existing users
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  SELECT p_organization_id, u.id, 'member', 'active'
  FROM auth.users u
  WHERE public.normalize_email(u.email) = ANY (
    SELECT public.normalize_email(e) FROM unnest(p_emails) AS e
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_member_count = ROW_COUNT;

  -- Insert pending admin grants
  INSERT INTO public.organization_role_grants_pending (
    organization_id, email, desired_role, status, created_by
  )
  SELECT
    p_organization_id,
    public.normalize_email(e),
    'admin',
    'pending',
    v_user_id
  FROM unnest(p_admin_emails) AS e
  ON CONFLICT (organization_id, email) DO NOTHING;

  -- Apply admin grants immediately for Google-verified users
  UPDATE public.organization_members om
  SET role = 'admin'
  FROM auth.users u
  WHERE om.organization_id = p_organization_id
    AND om.user_id = u.id
    AND public.normalize_email(u.email) = ANY (
      SELECT public.normalize_email(e) FROM unnest(p_admin_emails) AS e
    )
    AND om.role = 'member'
    AND public.is_user_google_oauth_verified(u.id);

  GET DIAGNOSTICS v_admin_applied = ROW_COUNT;

  UPDATE public.organization_role_grants_pending pg
  SET status = 'applied',
      applied_user_id = u.id,
      applied_at = now()
  FROM auth.users u
  WHERE pg.organization_id = p_organization_id
    AND pg.status = 'pending'
    AND public.normalize_email(pg.email) = public.normalize_email(u.email)
    AND public.is_user_google_oauth_verified(u.id);

  SELECT COUNT(*) INTO v_admin_pending
  FROM public.organization_role_grants_pending pg
  WHERE pg.organization_id = p_organization_id
    AND pg.status = 'pending';

  RETURN jsonb_build_object(
    'members_added', v_member_count,
    'admin_applied', v_admin_applied,
    'admin_pending', v_admin_pending
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_pending_admin_grants_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF NOT public.is_user_google_oauth_verified(p_user_id) THEN
    RETURN 0;
  END IF;

  UPDATE public.organization_members om
  SET role = 'admin'
  FROM auth.users u
  WHERE om.user_id = p_user_id
    AND u.id = p_user_id
    AND public.normalize_email(u.email) IN (
      SELECT public.normalize_email(pg.email)
      FROM public.organization_role_grants_pending pg
      WHERE pg.status = 'pending'
        AND pg.organization_id = om.organization_id
    )
    AND om.role = 'member';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.organization_role_grants_pending pg
  SET status = 'applied',
      applied_user_id = p_user_id,
      applied_at = now()
  FROM auth.users u
  WHERE u.id = p_user_id
    AND pg.status = 'pending'
    AND public.normalize_email(pg.email) = public.normalize_email(u.email);

  RETURN v_count;
END;
$$;

-- =============================================================================
-- RLS policies
-- =============================================================================

ALTER TABLE public.workspace_domain_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_workspace_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_workspace_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_workspace_directory_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_member_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_role_grants_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_organizations ENABLE ROW LEVEL SECURITY;

-- Domain claims: requester can view their own; insert via RPC uses auth.uid
CREATE POLICY workspace_domain_claims_select_own
  ON public.workspace_domain_claims
  FOR SELECT
  USING (requested_by_user_id = auth.uid());

-- Workspace domains: only members can see their org mapping
CREATE POLICY workspace_domains_select_member
  ON public.workspace_domains
  FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
  ));

-- OAuth sessions: admins can insert
CREATE POLICY google_workspace_oauth_sessions_insert
  ON public.google_workspace_oauth_sessions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Directory users: admins can select
CREATE POLICY google_workspace_directory_users_select_admin
  ON public.google_workspace_directory_users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Member claims: admins can select/insert/update
CREATE POLICY organization_member_claims_select_admin
  ON public.organization_member_claims
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY organization_member_claims_insert_admin
  ON public.organization_member_claims
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY organization_member_claims_update_admin
  ON public.organization_member_claims
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Pending role grants: admins can select/insert/update
CREATE POLICY organization_role_grants_pending_select_admin
  ON public.organization_role_grants_pending
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY organization_role_grants_pending_insert_admin
  ON public.organization_role_grants_pending
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY organization_role_grants_pending_update_admin
  ON public.organization_role_grants_pending
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Personal organizations: owner only
CREATE POLICY personal_organizations_select_own
  ON public.personal_organizations
  FOR SELECT
  USING (user_id = auth.uid());

-- =============================================================================
-- Grants
-- =============================================================================

GRANT ALL ON FUNCTION public.normalize_email(text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.normalize_domain(text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.request_workspace_domain_claim(text) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.create_workspace_organization_for_domain(text, text) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.create_google_workspace_oauth_session(uuid, text, text) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.validate_google_workspace_oauth_session(text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_google_workspace_connection_status(uuid) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.select_google_workspace_members(uuid, text[], text[]) TO authenticated, service_role;
GRANT ALL ON FUNCTION public.apply_pending_admin_grants_for_user(uuid) TO authenticated, service_role;

