-- Issue #1092: invited signup users skip personal-org onboarding and land on invited org.

CREATE OR REPLACE FUNCTION public.get_product_onboarding_status(p_organization_id uuid)
RETURNS TABLE(
  needs_onboarding boolean,
  teams_count bigint,
  equipment_count bigint,
  completed_at timestamptz,
  is_org_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_completed_at timestamptz;
  v_teams_count bigint := 0;
  v_equipment_count bigint := 0;
  v_skip_invite_onboarding boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT om.role, om.status, om.product_onboarding_completed_at
  INTO v_role, v_status, v_completed_at
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
  LIMIT 1;

  IF v_role IS NULL OR v_status IS DISTINCT FROM 'active' THEN
    needs_onboarding := false;
    teams_count := 0;
    equipment_count := 0;
    completed_at := NULL;
    is_org_admin := false;
    RETURN NEXT;
    RETURN;
  END IF;

  is_org_admin := v_role IN ('owner', 'admin');
  completed_at := v_completed_at;

  SELECT COUNT(*)::bigint INTO v_teams_count
  FROM public.teams t
  WHERE t.organization_id = p_organization_id;

  SELECT COUNT(*)::bigint INTO v_equipment_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id;

  teams_count := v_teams_count;
  equipment_count := v_equipment_count;

  IF is_org_admin
    AND v_completed_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.personal_organizations po
      WHERE po.user_id = v_user_id
        AND po.organization_id = p_organization_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = v_user_id
          AND (
            u.raw_user_meta_data ? 'invited_organization_id'
            OR u.raw_user_meta_data->>'signup_source' = 'invite'
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om_other
        WHERE om_other.user_id = v_user_id
          AND om_other.organization_id <> p_organization_id
          AND om_other.status = 'active'
          AND om_other.access_source = 'invitation'
      )
    ) THEN
    v_skip_invite_onboarding := true;
  END IF;

  needs_onboarding := is_org_admin
    AND v_completed_at IS NULL
    AND NOT (v_teams_count > 0 AND v_equipment_count > 0)
    AND NOT v_skip_invite_onboarding;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_product_onboarding_status(uuid) IS
  'Returns whether the current user must complete product onboarding for the given organization. Established orgs with teams and equipment bypass the wizard; invited signup users skip the checklist on their personal org.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
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
  skip_personal_onboarding boolean := false;
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

      IF NOT has_workspace_claim AND NOT has_workspace_invite THEN
        skip_personal_org := true;
      END IF;
    END IF;
  END IF;

  skip_personal_onboarding := NEW.raw_user_meta_data ? 'invited_organization_id'
    OR NEW.raw_user_meta_data->>'signup_source' = 'invite';

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

    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      access_source,
      product_onboarding_completed_at
    )
    VALUES (
      new_org_id,
      NEW.id,
      'owner',
      'active',
      'owner',
      CASE WHEN skip_personal_onboarding THEN NOW() ELSE NULL END
    )
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
  'Trigger for new user registration. Creates profile and personal org when allowed; invited signup users skip personal onboarding checklist.';

REVOKE ALL ON FUNCTION public.get_product_onboarding_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_onboarding_status(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_product_onboarding_status(uuid) TO authenticated, service_role;

-- rpc-authenticated-grant-allowed: get_product_onboarding_status
