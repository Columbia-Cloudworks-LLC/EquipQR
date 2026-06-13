-- Migration: Google Workspace access contract
-- Purpose: explicit authorization for claimed domains, directory reconciliation, safe disconnect

-- =============================================================================
-- Membership attribution
-- =============================================================================

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS access_source text;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_access_source_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_access_source_check
  CHECK (
    access_source IS NULL
    OR access_source = ANY (ARRAY['google_workspace'::text, 'invitation'::text, 'owner'::text, 'manual'::text])
  );

COMMENT ON COLUMN public.organization_members.access_source IS
  'How this membership was created: google_workspace import/claim, invitation, owner bootstrap, or manual admin add.';

-- Backfill owner memberships on personal orgs
UPDATE public.organization_members om
SET access_source = 'owner'
FROM public.personal_organizations po
WHERE om.organization_id = po.organization_id
  AND om.user_id = po.user_id
  AND om.role = 'owner'
  AND om.access_source IS NULL;

-- Backfill workspace-derived memberships from active claims
UPDATE public.organization_members om
SET access_source = 'google_workspace'
FROM auth.users u, public.organization_member_claims c
WHERE om.organization_id = c.organization_id
  AND om.user_id = u.id
  AND public.normalize_email(c.email) = public.normalize_email(u.email)
  AND c.source = 'google_workspace'
  AND c.status IN ('selected', 'claimed')
  AND om.access_source IS NULL;

-- =============================================================================
-- Workspace onboarding state: expose access posture for claimed domains
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_workspace_onboarding_state(uuid);

CREATE FUNCTION public.get_workspace_onboarding_state(p_user_id uuid)
RETURNS TABLE(
  email text,
  domain text,
  domain_status text,
  workspace_org_id uuid,
  is_workspace_connected boolean,
  has_workspace_membership boolean,
  has_pending_invitation boolean,
  has_pending_claim boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_domain text;
  v_workspace_org_id uuid;
  v_connected boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  v_domain := split_part(public.normalize_email(v_email), '@', 2);

  SELECT d.organization_id
  INTO v_workspace_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = public.normalize_domain(v_domain);

  IF v_workspace_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.google_workspace_credentials gwc
      WHERE gwc.organization_id = v_workspace_org_id
        AND public.normalize_domain(gwc.domain) = public.normalize_domain(v_domain)
    ) INTO v_connected;
  END IF;

  email := v_email;
  domain := v_domain;
  workspace_org_id := v_workspace_org_id;
  is_workspace_connected := v_connected;
  domain_status := CASE
    WHEN v_workspace_org_id IS NOT NULL THEN 'claimed'
    ELSE 'unclaimed'
  END;

  has_workspace_membership := false;
  has_pending_invitation := false;
  has_pending_claim := false;

  IF v_workspace_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = v_workspace_org_id
        AND om.user_id = p_user_id
        AND om.status = 'active'
    ) INTO has_workspace_membership;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_invitations oi
      WHERE oi.organization_id = v_workspace_org_id
        AND public.normalize_email(oi.email) = public.normalize_email(v_email)
        AND oi.status = 'pending'
        AND oi.expires_at > now()
    ) INTO has_pending_invitation;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_member_claims c
      WHERE c.organization_id = v_workspace_org_id
        AND public.normalize_email(c.email) = public.normalize_email(v_email)
        AND c.status = 'selected'
    ) INTO has_pending_claim;
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_workspace_onboarding_state(uuid) IS
  'Returns workspace onboarding and claimed-domain access posture for a user. Self-only when auth.uid() is present.';

REVOKE ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) FROM authenticated;

-- rpc-authenticated-grant-allowed: get_workspace_onboarding_state
GRANT EXECUTE ON FUNCTION public.get_workspace_onboarding_state(uuid) TO authenticated, service_role;

-- =============================================================================
-- handle_new_user: explicit authorization only (no domain auto-join)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  personal_org_id uuid;
  org_name text;
  invited_name text;
  workspace_org_id uuid;
  user_domain text;
  is_google_user boolean := false;
  is_consumer_domain boolean := false;
  has_workspace_claim boolean := false;
  has_workspace_invite boolean := false;
  skip_personal_org boolean := false;
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        updated_at = NOW();

  user_domain := split_part(public.normalize_email(NEW.email), '@', 2);
  is_google_user := public.is_user_google_oauth_verified(NEW.id)
    OR (COALESCE(NEW.raw_app_meta_data->>'provider', '') = 'google');
  is_consumer_domain := COALESCE(user_domain IN ('gmail.com', 'googlemail.com'), false);

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_member_claims c
    WHERE public.normalize_email(c.email) = public.normalize_email(NEW.email)
      AND c.status IN ('selected', 'claimed')
  ) INTO has_workspace_claim;

  IF is_google_user AND NOT is_consumer_domain AND user_domain IS NOT NULL THEN
    SELECT d.organization_id INTO workspace_org_id
    FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = public.normalize_domain(user_domain)
    LIMIT 1;

    IF workspace_org_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.organization_invitations oi
        WHERE oi.organization_id = workspace_org_id
          AND public.normalize_email(oi.email) = public.normalize_email(NEW.email)
          AND oi.status = 'pending'
          AND oi.expires_at > now()
      ) INTO has_workspace_invite;

      -- Claimed-domain Google users without explicit authorization do not get a personal org.
      IF NOT has_workspace_claim AND NOT has_workspace_invite THEN
        skip_personal_org := true;
      END IF;
    END IF;
  END IF;

  SELECT organization_id INTO personal_org_id
  FROM public.personal_organizations
  WHERE user_id = NEW.id;

  IF personal_org_id IS NULL AND NOT skip_personal_org THEN
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

    IF NEW.raw_user_meta_data ? 'invited_organization_id' THEN
      SELECT name INTO invited_name
      FROM public.organizations
      WHERE id = (NEW.raw_user_meta_data->>'invited_organization_id')::uuid;
    ELSIF NEW.raw_user_meta_data ? 'invited_organization_name' THEN
      invited_name := NEW.raw_user_meta_data->>'invited_organization_name';
    END IF;

    IF invited_name IS NOT NULL AND lower(trim(org_name)) = lower(trim(invited_name)) THEN
      RAISE EXCEPTION 'ORGANIZATION_NAME_CONFLICT_WITH_INVITED'
        USING DETAIL = 'Choose a different organization name than the one inviting you.';
    END IF;

    INSERT INTO public.organizations (name, plan, member_count, max_members, features)
    VALUES (
      org_name,
      'free',
      1,
      5,
      ARRAY['Equipment Management', 'Work Orders', 'Team Management']
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.personal_organizations (user_id, organization_id)
    VALUES (NEW.id, new_org_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
    VALUES (new_org_id, NEW.id, 'owner', 'active', 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  SELECT c.organization_id, NEW.id, 'member', 'active', 'google_workspace'
  FROM public.organization_member_claims c
  WHERE public.normalize_email(c.email) = public.normalize_email(NEW.email)
    AND c.status IN ('selected', 'claimed')
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = CASE
          WHEN public.organization_members.access_source IS NULL
            OR public.organization_members.access_source = 'google_workspace'
            THEN 'active'
          ELSE public.organization_members.status
        END,
        access_source = COALESCE(public.organization_members.access_source, 'google_workspace')
    WHERE public.organization_members.access_source IS NULL
       OR public.organization_members.access_source = 'google_workspace';

  UPDATE public.organization_member_claims
  SET status = 'claimed',
      claimed_user_id = NEW.id,
      claimed_at = now()
  WHERE public.normalize_email(email) = public.normalize_email(NEW.email)
    AND status = 'selected';

  PERFORM public.apply_pending_admin_grants_for_user(NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger for new user registration. Creates profile and personal org when allowed; never auto-joins claimed Workspace domains without explicit claim or invitation.';

-- =============================================================================
-- auto_provision_workspace_organization: claim/reuse org without bulk user migration
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

  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL THEN
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT o.id INTO v_existing_org_id
  FROM public.organizations o
  JOIN public.organization_members om ON om.organization_id = o.id
  LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
  WHERE om.user_id = p_user_id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND po.organization_id IS NULL
  ORDER BY o.created_at ASC
  LIMIT 1;

  IF v_existing_org_id IS NOT NULL THEN
    INSERT INTO public.workspace_domains (domain, organization_id)
    VALUES (v_domain, v_existing_org_id)
    ON CONFLICT (domain) DO NOTHING;

    IF NOT FOUND THEN
      SELECT d.organization_id INTO v_existing_org_id
      FROM public.workspace_domains d
      WHERE public.normalize_domain(d.domain) = v_domain;
    END IF;

    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
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

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  VALUES (v_org_id, p_user_id, 'owner', 'active', 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id)
  ON CONFLICT (domain) DO NOTHING;

  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL AND v_existing_org_id <> v_org_id THEN
    DELETE FROM public.organization_members
    WHERE organization_id = v_org_id;

    DELETE FROM public.organizations
    WHERE id = v_org_id;

    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  organization_id := v_org_id;
  domain := v_domain;
  already_existed := false;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) IS
  'Atomically provisions or reuses an owner-managed organization for a Workspace domain without migrating same-domain users by default.';

GRANT EXECUTE ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) TO service_role;

-- =============================================================================
-- select_google_workspace_members: tag workspace-derived memberships
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
  v_invalid_emails text[];
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

  SELECT array_agg(normalized_email ORDER BY normalized_email)
  INTO v_invalid_emails
  FROM (
    SELECT public.normalize_email(e) AS normalized_email
    FROM unnest(p_emails) AS e
  ) requested
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.google_workspace_directory_users gdu
    WHERE gdu.organization_id = p_organization_id
      AND public.normalize_email(gdu.primary_email) = requested.normalized_email
      AND gdu.suspended = false
  );

  IF v_invalid_emails IS NOT NULL AND array_length(v_invalid_emails, 1) > 0 THEN
    RAISE EXCEPTION
      'One or more emails are not active Google Workspace directory users for this organization: %',
      array_to_string(v_invalid_emails, ', ');
  END IF;

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
  ON CONFLICT (organization_id, public.normalize_email(email))
    WHERE status IN ('selected', 'claimed')
    DO UPDATE
      SET status = 'selected',
          created_by = EXCLUDED.created_by,
          created_at = now();

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  SELECT p_organization_id, u.id, 'member', 'active', 'google_workspace'
  FROM auth.users u
  WHERE public.normalize_email(u.email) = ANY (
    SELECT public.normalize_email(e) FROM unnest(p_emails) AS e
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'active',
        access_source = 'google_workspace'
    WHERE public.organization_members.access_source IS NULL
       OR public.organization_members.access_source = 'google_workspace';

  GET DIAGNOSTICS v_member_count = ROW_COUNT;

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
  ON CONFLICT (organization_id, public.normalize_email(email))
    WHERE status = 'pending'
    DO NOTHING;

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

-- =============================================================================
-- accept_invitation_atomic: tag invitation-derived memberships
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(
  p_invitation_token uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  invitation_record RECORD;
  org_name TEXT;
  result jsonb;
BEGIN
  SELECT id, organization_id, email, role, status, expires_at, accepted_by
  INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF invitation_record.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been processed');
  END IF;

  IF invitation_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
      AND lower(trim(email)) = lower(trim(invitation_record.email))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email does not match invitation email');
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = invitation_record.organization_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  END IF;

  UPDATE organization_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now()
  WHERE id = invitation_record.id;

  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    access_source
  ) VALUES (
    invitation_record.organization_id,
    p_user_id,
    invitation_record.role,
    'active',
    'invitation'
  );

  SELECT name INTO org_name
  FROM organizations
  WHERE id = invitation_record.organization_id;

  result := jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'organization_name', COALESCE(org_name, 'Unknown Organization'),
    'role', invitation_record.role
  );

  RETURN result;

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to accept invitation: ' || SQLERRM);
END;
$$;

-- =============================================================================
-- disconnect_google_workspace: clear directory cache, keep domain claimed
-- =============================================================================

CREATE OR REPLACE FUNCTION public.disconnect_google_workspace(
  p_organization_id uuid,
  p_also_unclaim_domain boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_domain text;
  v_credentials_deleted int := 0;
  v_domain_unclaimed int := 0;
  v_directory_users_deleted int := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND status = 'active';

  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Must be organization owner or admin to disconnect Google Workspace';
  END IF;

  SELECT domain INTO v_domain
  FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id
  LIMIT 1;

  DELETE FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_credentials_deleted = ROW_COUNT;

  DELETE FROM public.google_workspace_directory_users
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_directory_users_deleted = ROW_COUNT;

  IF p_also_unclaim_domain AND v_domain IS NOT NULL THEN
    DELETE FROM public.workspace_domains
    WHERE organization_id = p_organization_id
      AND public.normalize_domain(domain) = public.normalize_domain(v_domain);
    GET DIAGNOSTICS v_domain_unclaimed = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credentials_deleted', v_credentials_deleted,
    'directory_users_deleted', v_directory_users_deleted,
    'domain_unclaimed', v_domain_unclaimed,
    'domain', v_domain
  );
END;
$$;

COMMENT ON FUNCTION public.disconnect_google_workspace(uuid, boolean) IS
  'Disconnects Google Workspace OAuth credentials and directory cache. Keeps workspace_domains claimed unless also_unclaim_domain is true.';

REVOKE ALL ON FUNCTION public.disconnect_google_workspace(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disconnect_google_workspace(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.disconnect_google_workspace(uuid, boolean) FROM authenticated;

-- rpc-authenticated-grant-allowed: disconnect_google_workspace
GRANT EXECUTE ON FUNCTION public.disconnect_google_workspace(uuid, boolean) TO authenticated, service_role;

-- =============================================================================
-- reconcile_google_workspace_directory: revoke stale workspace-derived access
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_google_workspace_directory(
  p_organization_id uuid,
  p_active_google_user_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_directory_marked_suspended int := 0;
  v_members_deactivated int := 0;
  v_claims_revoked int := 0;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  UPDATE public.google_workspace_directory_users gdu
  SET suspended = true,
      updated_at = now()
  WHERE gdu.organization_id = p_organization_id
    AND NOT (gdu.google_user_id = ANY (COALESCE(p_active_google_user_ids, ARRAY[]::text[])));
  GET DIAGNOSTICS v_directory_marked_suspended = ROW_COUNT;

  UPDATE public.organization_member_claims c
  SET status = 'revoked'
  WHERE c.organization_id = p_organization_id
    AND c.source = 'google_workspace'
    AND c.status IN ('selected', 'claimed')
    AND NOT EXISTS (
      SELECT 1
      FROM public.google_workspace_directory_users gdu
      WHERE gdu.organization_id = p_organization_id
        AND public.normalize_email(gdu.primary_email) = public.normalize_email(c.email)
        AND gdu.suspended = false
    );
  GET DIAGNOSTICS v_claims_revoked = ROW_COUNT;

  UPDATE public.organization_members om
  SET status = 'inactive'
  FROM auth.users u
  WHERE om.organization_id = p_organization_id
    AND om.user_id = u.id
    AND om.status = 'active'
    AND om.access_source = 'google_workspace'
    AND NOT EXISTS (
      SELECT 1
      FROM public.google_workspace_directory_users gdu
      WHERE gdu.organization_id = p_organization_id
        AND public.normalize_email(gdu.primary_email) = public.normalize_email(u.email)
        AND gdu.suspended = false
    );
  GET DIAGNOSTICS v_members_deactivated = ROW_COUNT;

  RETURN jsonb_build_object(
    'directory_marked_suspended', v_directory_marked_suspended,
    'members_deactivated', v_members_deactivated,
    'claims_revoked', v_claims_revoked
  );
END;
$$;

COMMENT ON FUNCTION public.reconcile_google_workspace_directory(uuid, text[]) IS
  'Marks directory users missing from the latest sync as suspended and revokes workspace-derived memberships/claims for inactive directory users.';

REVOKE ALL ON FUNCTION public.reconcile_google_workspace_directory(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_google_workspace_directory(uuid, text[]) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_google_workspace_directory(uuid, text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_google_workspace_directory(uuid, text[]) TO service_role;
