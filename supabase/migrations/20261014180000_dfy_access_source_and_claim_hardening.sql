-- Done-For-You follow-ups (issue #1648 review):
--   * Dedicated access_source values: 'provisioned' (claimed DFY membership) and
--     'support' (owner-granted, time-limited EquipQR Support access).
--   * Claiming never aborts a sign-in: each staged row is claimed in its own
--     subtransaction; a failure leaves the row pending with last_claim_error.
--   * Claims lock the organization row so operator edits and claims serialize.
--   * claimed_role records the role actually granted (a staged owner becomes
--     admin when the org already has an active owner).
--   * Org owners/admins can revoke still-pending staged people in the app.
--   * A user whose personal org was skipped for a staged email that was revoked
--     before they verified gets their personal org on verification.

-- =============================================================================
-- access_source
-- =============================================================================

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_access_source_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_access_source_check
  CHECK (
    access_source IS NULL
    OR access_source = ANY (ARRAY[
      'google_workspace'::text,
      'invitation'::text,
      'owner'::text,
      'manual'::text,
      'provisioned'::text,
      'support'::text
    ])
  );

COMMENT ON COLUMN public.organization_members.access_source IS
  'How this membership was created: google_workspace import/claim, invitation, owner bootstrap, manual admin add, provisioned (claimed Done-For-You staged membership), or support (owner-granted, time-limited EquipQR Support access).';

-- =============================================================================
-- Staged-row bookkeeping
-- =============================================================================

ALTER TABLE public.organization_provisioned_members
  ADD COLUMN IF NOT EXISTS claimed_role text,
  ADD COLUMN IF NOT EXISTS last_claim_error text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.organization_provisioned_members
  DROP CONSTRAINT IF EXISTS organization_provisioned_members_claimed_role_check;
ALTER TABLE public.organization_provisioned_members
  ADD CONSTRAINT organization_provisioned_members_claimed_role_check
  CHECK (claimed_role IS NULL OR claimed_role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]));

COMMENT ON COLUMN public.organization_provisioned_members.claimed_role IS
  'Organization role actually granted at claim time (differs from role when a staged owner was downgraded to admin).';
COMMENT ON COLUMN public.organization_provisioned_members.last_claim_error IS
  'Error from the most recent failed claim attempt; the row stays pending and the sign-in proceeds.';

CREATE INDEX IF NOT EXISTS idx_org_provisioned_members_revoked_by
  ON public.organization_provisioned_members (revoked_by);

-- Backfill: claimed DFY memberships were recorded as 'invitation'.
UPDATE public.organization_members om
SET access_source = 'provisioned'
FROM public.organization_provisioned_members pm
WHERE pm.status = 'claimed'
  AND pm.organization_id = om.organization_id
  AND pm.claimed_user_id = om.user_id
  AND om.access_source = 'invitation';

UPDATE public.organization_provisioned_members pm
SET claimed_role = om.role
FROM public.organization_members om
WHERE pm.status = 'claimed'
  AND pm.claimed_role IS NULL
  AND om.organization_id = pm.organization_id
  AND om.user_id = pm.claimed_user_id;

-- =============================================================================
-- Personal organization bootstrap (shared by handle_new_user's DFY skip path)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_personal_organization(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id uuid;
  v_name text;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.personal_organizations
  WHERE user_id = p_user_id;

  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  SELECT COALESCE(u.raw_user_meta_data->>'organization_name', 'My Organization')
  INTO v_name
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    v_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.personal_organizations (user_id, organization_id)
  VALUES (p_user_id, v_org_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  VALUES (v_org_id, p_user_id, 'owner', 'active', 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_personal_organization(uuid) IS
  'Creates the user''s personal "My Organization" when they have none. Internal: used when a Done-For-You staged row that suppressed the personal org was revoked before the user verified.';

REVOKE ALL ON FUNCTION public.ensure_personal_organization(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_personal_organization(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.ensure_personal_organization(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_personal_organization(uuid) TO service_role;

-- =============================================================================
-- Claim: per-row subtransactions, org lock, 'provisioned', claimed_role
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

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RETURN 0;
  END IF;

  FOR v_row IN
    SELECT pm.id, pm.organization_id, pm.role, pm.team_id, pm.team_role
    FROM public.organization_provisioned_members pm
    WHERE pm.email = v_email
      AND pm.status = 'pending'
    ORDER BY pm.created_at
  LOOP
    -- A failed claim must never abort the auth.users write that called us
    -- (Google sign-up or email confirmation); keep the row pending instead.
    BEGIN
      -- Serialize with operator edits on the same unclaimed organization.
      PERFORM 1 FROM public.organizations o WHERE o.id = v_row.organization_id FOR UPDATE;

      -- Re-check under the lock: an operator may have revoked it meanwhile.
      PERFORM 1
      FROM public.organization_provisioned_members pm
      WHERE pm.id = v_row.id
        AND pm.status = 'pending'
      FOR UPDATE;
      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      v_role := v_row.role;

      -- Never create a second owner.
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
        'provisioned',
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
            )
      RETURNING role INTO v_role;

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
          claimed_at = now(),
          claimed_role = v_role,
          last_claim_error = NULL
      WHERE id = v_row.id;

      IF v_role = 'owner' THEN
        UPDATE public.organizations
        SET claimed_at = COALESCE(claimed_at, now())
        WHERE id = v_row.organization_id;
      END IF;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.organization_provisioned_members
      SET last_claim_error = left(SQLERRM, 500)
      WHERE id = v_row.id;
      RAISE WARNING 'claim_provisioned_memberships: staged row % not claimed: %', v_row.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.claim_provisioned_memberships(uuid) IS
  'Binds pending organization_provisioned_members rows matching the user''s verified email to active memberships (access_source provisioned). Each row is claimed in its own subtransaction so a failure never aborts the sign-in. Internal: no client EXECUTE.';

REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_provisioned_memberships(uuid) TO service_role;

-- =============================================================================
-- Email confirmation: claim, then restore the personal org if DFY skipped it
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.claim_provisioned_memberships(NEW.id);

  -- handle_new_user skipped the personal org because a staged row was pending
  -- for this email. If that row was revoked before the user verified, they
  -- would otherwise land with no organization at all.
  IF OLD.email_confirmed_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = NEW.id
        AND om.status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.personal_organizations po
      WHERE po.user_id = NEW.id
    )
    AND EXISTS (
      SELECT 1 FROM public.organization_provisioned_members pm
      WHERE pm.email = public.normalize_email(NEW.email)
    )
  THEN
    PERFORM public.ensure_personal_organization(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_email_confirmed_claim() IS
  'auth.users AFTER UPDATE trigger: claims pre-staged memberships once an email becomes verified, and creates the personal org when a revoked staged row had suppressed it (issue #1648).';

REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM anon;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM authenticated;

-- =============================================================================
-- Owner/admin revoke of a still-pending staged person
-- =============================================================================

CREATE OR REPLACE FUNCTION public.revoke_provisioned_member(p_staged_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT pm.organization_id INTO v_org_id
  FROM public.organization_provisioned_members pm
  WHERE pm.id = p_staged_member_id;

  IF v_org_id IS NULL OR NOT public.is_org_admin(v_user_id, v_org_id) THEN
    RAISE EXCEPTION 'Staged member not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_provisioned_members
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = v_user_id
  WHERE id = p_staged_member_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only pending staged members can be revoked' USING ERRCODE = '22023';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.revoke_provisioned_member(uuid) IS
  'Org owners/admins revoke a Done-For-You staged person who has not signed in yet.';

REVOKE ALL ON FUNCTION public.revoke_provisioned_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_provisioned_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_provisioned_member(uuid) FROM authenticated;

-- rpc-authenticated-grant-allowed: revoke_provisioned_member
GRANT EXECUTE ON FUNCTION public.revoke_provisioned_member(uuid) TO authenticated, service_role;

-- =============================================================================
-- Product onboarding: claimed DFY staff skip personal onboarding like invitees
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_product_onboarding_status(p_organization_id uuid)
RETURNS TABLE(
  needs_onboarding boolean,
  teams_count bigint,
  equipment_count bigint,
  completed_at timestamp with time zone,
  is_org_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
        JOIN public.organization_invitations oi
          ON public.normalize_email(oi.email) = public.normalize_email(u.email)
        WHERE u.id = v_user_id
          AND oi.status = 'pending'
          AND oi.expires_at > now()
          AND oi.invited_by IS DISTINCT FROM v_user_id
          AND oi.organization_id <> p_organization_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om_other
        WHERE om_other.user_id = v_user_id
          AND om_other.organization_id <> p_organization_id
          AND om_other.status = 'active'
          AND om_other.access_source IN ('invitation', 'provisioned')
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
$function$;
