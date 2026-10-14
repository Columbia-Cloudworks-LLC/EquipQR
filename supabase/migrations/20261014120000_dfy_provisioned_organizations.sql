-- Issue #1648: "Done-For-You" pre-provisioned tenant yards with email-bound claiming.
--
-- An operator (service role) provisions an organization, imports its equipment,
-- and pre-stages staff by email before any of those people have an auth.users
-- row. When a staged person signs in for the first time with a verified email
-- (Google OAuth, magic link / invite link, or confirmed email signup), the
-- pending row is bound to their new identity: they get an active membership with
-- the pre-assigned role, skip the personal-org bootstrap, and skip the product
-- onboarding checklist for the claimed yard.
--
-- Security model:
--   * organization_provisioned_members is writable only by service_role.
--   * Claiming requires auth.users.email_confirmed_at IS NOT NULL, so an
--     unconfirmed password signup using a staged email binds nothing.
--   * Unclaimed organizations have no organization_members rows, so the existing
--     membership-based RLS keeps them invisible to every authenticated user.
--   * The claim/stage functions are SECURITY DEFINER internals: no anon or
--     authenticated EXECUTE.

-- =============================================================================
-- Organization provisioning metadata
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

COMMENT ON COLUMN public.organizations.provisioned_at IS
  'Set when the organization was pre-provisioned by an operator (Done-For-You onboarding, issue #1648).';
COMMENT ON COLUMN public.organizations.claimed_at IS
  'Set when the first staged owner of a pre-provisioned organization claimed it.';

-- =============================================================================
-- Shadow memberships keyed by email
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_provisioned_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team_role public.team_member_role,
  status text NOT NULL DEFAULT 'pending',
  claimed_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_provisioned_members_email_normalized_check
    CHECK (email = public.normalize_email(email) AND email LIKE '%_@_%'),
  CONSTRAINT organization_provisioned_members_role_check
    CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  CONSTRAINT organization_provisioned_members_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'claimed'::text, 'revoked'::text])),
  CONSTRAINT organization_provisioned_members_team_role_check
    CHECK (team_role IS NULL OR team_id IS NOT NULL),
  CONSTRAINT organization_provisioned_members_claim_check
    CHECK ((status = 'claimed') = (claimed_at IS NOT NULL))
);

COMMENT ON TABLE public.organization_provisioned_members IS
  'Pre-staged (shadow) memberships for operator-provisioned organizations, keyed by normalized email. Claimed automatically when a user with that verified email signs in (issue #1648). Service-role writes only.';

-- One live (pending or claimed) row per (organization, email).
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_provisioned_members_live_email
  ON public.organization_provisioned_members (organization_id, email)
  WHERE status <> 'revoked';

-- At most one live staged owner per organization.
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_provisioned_members_live_owner
  ON public.organization_provisioned_members (organization_id)
  WHERE role = 'owner' AND status <> 'revoked';

-- Claim lookup by email.
CREATE INDEX IF NOT EXISTS idx_org_provisioned_members_pending_email
  ON public.organization_provisioned_members (email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_org_provisioned_members_claimed_user
  ON public.organization_provisioned_members (claimed_user_id);

CREATE INDEX IF NOT EXISTS idx_org_provisioned_members_team_id
  ON public.organization_provisioned_members (team_id);

DROP TRIGGER IF EXISTS update_organization_provisioned_members_updated_at
  ON public.organization_provisioned_members;
CREATE TRIGGER update_organization_provisioned_members_updated_at
  BEFORE UPDATE ON public.organization_provisioned_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.organization_provisioned_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_provisioned_members FROM PUBLIC;
REVOKE ALL ON TABLE public.organization_provisioned_members FROM anon;
REVOKE ALL ON TABLE public.organization_provisioned_members FROM authenticated;
GRANT SELECT ON TABLE public.organization_provisioned_members TO authenticated;
GRANT ALL ON TABLE public.organization_provisioned_members TO service_role;

-- Org admins can review the staged roster; a user can see the rows they claimed
-- (the client uses this to show the post-claim QuickBooks prompt).
DROP POLICY IF EXISTS organization_provisioned_members_select
  ON public.organization_provisioned_members;
CREATE POLICY organization_provisioned_members_select
  ON public.organization_provisioned_members
  FOR SELECT
  TO authenticated
  USING (
    claimed_user_id = (SELECT auth.uid())
    OR public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- =============================================================================
-- Claim: bind pending staged rows to a verified identity
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_provisioned_memberships(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_confirmed_at timestamptz;
  v_row record;
  v_role text;
  v_count integer := 0;
BEGIN
  SELECT public.normalize_email(u.email), u.email_confirmed_at
  INTO v_email, v_confirmed_at
  FROM auth.users u
  WHERE u.id = p_user_id;

  -- Only a verified email may claim a staged membership.
  IF v_email IS NULL OR v_confirmed_at IS NULL THEN
    RETURN 0;
  END IF;

  -- Claim rows may reference profiles; handle_new_user creates the profile
  -- first, but email-confirmation updates can race profile backfills.
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RETURN 0;
  END IF;

  FOR v_row IN
    SELECT pm.*
    FROM public.organization_provisioned_members pm
    WHERE pm.email = v_email
      AND pm.status = 'pending'
    ORDER BY pm.created_at
    FOR UPDATE
  LOOP
    v_role := v_row.role;

    -- Never create a second owner; an org that already has an active owner
    -- (e.g. claimed by someone else after an ownership transfer) gets an admin.
    IF v_role = 'owner' AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = v_row.organization_id
        AND om.role = 'owner'
        AND om.status = 'active'
        AND om.user_id <> p_user_id
    ) THEN
      v_role := 'admin';
    END IF;

    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      access_source,
      product_onboarding_completed_at
    )
    VALUES (
      v_row.organization_id,
      p_user_id,
      v_role,
      'active',
      'invitation',
      now()
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET status = 'active',
          role = CASE
            WHEN public.organization_members.role = 'owner' THEN 'owner'
            WHEN EXCLUDED.role = 'owner' THEN 'owner'
            WHEN EXCLUDED.role = 'admin' OR public.organization_members.role = 'admin' THEN 'admin'
            ELSE public.organization_members.role
          END,
          product_onboarding_completed_at = COALESCE(
            public.organization_members.product_onboarding_completed_at,
            now()
          );

    IF v_row.team_id IS NOT NULL THEN
      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (
        v_row.team_id,
        p_user_id,
        COALESCE(v_row.team_role, 'technician'::public.team_member_role)
      )
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    UPDATE public.organization_provisioned_members
    SET status = 'claimed',
        claimed_user_id = p_user_id,
        claimed_at = now()
    WHERE id = v_row.id;

    IF v_role = 'owner' THEN
      UPDATE public.organizations
      SET claimed_at = COALESCE(claimed_at, now())
      WHERE id = v_row.organization_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.claim_provisioned_memberships(uuid) IS
  'Binds pending organization_provisioned_members rows matching the user''s verified email to active memberships (issue #1648). Internal: called from auth.users triggers and stage_provisioned_member; no client EXECUTE.';

REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_provisioned_memberships(uuid) TO service_role;

-- =============================================================================
-- Stage: operator tooling entry point (service role)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.stage_provisioned_member(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_team_id uuid DEFAULT NULL,
  p_team_role public.team_member_role DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.normalize_email(p_email);
  v_id uuid;
  v_existing_user_id uuid;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required' USING ERRCODE = '22023';
  END IF;

  IF p_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = p_team_id
      AND t.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Team % does not belong to organization %', p_team_id, p_organization_id
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organization_provisioned_members (
    organization_id,
    email,
    role,
    team_id,
    team_role
  )
  VALUES (
    p_organization_id,
    v_email,
    p_role,
    p_team_id,
    CASE WHEN p_team_id IS NULL THEN NULL ELSE COALESCE(p_team_role, 'technician'::public.team_member_role) END
  )
  RETURNING id INTO v_id;

  -- Someone who already has a verified account claims immediately.
  SELECT u.id INTO v_existing_user_id
  FROM auth.users u
  WHERE public.normalize_email(u.email) = v_email
    AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    PERFORM public.claim_provisioned_memberships(v_existing_user_id);
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.stage_provisioned_member(uuid, text, text, uuid, public.team_member_role) IS
  'Operator tooling (service role): pre-stages an email-keyed membership on a provisioned organization; claims immediately when a verified account already exists (issue #1648).';

REVOKE ALL ON FUNCTION public.stage_provisioned_member(uuid, text, text, uuid, public.team_member_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stage_provisioned_member(uuid, text, text, uuid, public.team_member_role) FROM anon;
REVOKE ALL ON FUNCTION public.stage_provisioned_member(uuid, text, text, uuid, public.team_member_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.stage_provisioned_member(uuid, text, text, uuid, public.team_member_role) TO service_role;

-- =============================================================================
-- Claim on email confirmation (magic link / invite link / confirmed signup)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.claim_provisioned_memberships(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_email_confirmed_claim() IS
  'auth.users AFTER UPDATE trigger: claims pre-staged memberships once an email becomes verified (issue #1648).';

REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM anon;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM authenticated;

DO $$
BEGIN
  BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_email_confirmed_claim ON auth.users;

    CREATE TRIGGER on_auth_user_email_confirmed_claim
      AFTER UPDATE OF email, email_confirmed_at ON auth.users
      FOR EACH ROW
      WHEN (
        NEW.email_confirmed_at IS NOT NULL
        AND (
          OLD.email_confirmed_at IS NULL
          OR OLD.email IS DISTINCT FROM NEW.email
        )
      )
      EXECUTE FUNCTION public.handle_user_email_confirmed_claim();
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Insufficient privileges to create trigger on_auth_user_email_confirmed_claim on auth.users. Create it manually: CREATE TRIGGER on_auth_user_email_confirmed_claim AFTER UPDATE OF email, email_confirmed_at ON auth.users FOR EACH ROW WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email IS DISTINCT FROM NEW.email)) EXECUTE FUNCTION public.handle_user_email_confirmed_claim();';
  END;
END $$;

-- =============================================================================
-- handle_new_user: skip the personal org for staged emails, then claim
-- =============================================================================

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
  has_provisioned_membership boolean := false;
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

  -- Issue #1648: staged people land in their pre-provisioned yard, not in an
  -- empty "My Organization".
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_provisioned_members pm
    WHERE pm.email = public.normalize_email(NEW.email)
      AND pm.status = 'pending'
  ) INTO has_provisioned_membership;

  IF has_provisioned_membership THEN
    skip_personal_org := true;
  END IF;

  skip_personal_onboarding := EXISTS (
    SELECT 1
    FROM public.organization_invitations oi
    WHERE public.normalize_email(oi.email) = public.normalize_email(NEW.email)
      AND oi.status = 'pending'
      AND oi.expires_at > now()
      AND oi.invited_by IS DISTINCT FROM NEW.id
  );

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

  -- Issue #1648: binds now for verified-at-insert identities (Google OAuth);
  -- magic-link / invite / confirmed-signup users bind on confirmation via
  -- on_auth_user_email_confirmed_claim.
  PERFORM public.claim_provisioned_memberships(NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger for new user registration. Creates profile and personal org when allowed; invited signup users skip personal onboarding checklist; pre-provisioned (DFY) staff skip the personal org and claim their staged memberships.';
