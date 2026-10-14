-- In-app Done-For-You provisioning for EquipQR operators (issue #1648 review).
--
-- The dfy-provisioning Edge Function authenticates the caller, checks their
-- user ID against the DFY_OPERATOR_USER_IDS allowlist, and only then calls
-- these functions with the service role. Nothing here is callable by anon or
-- authenticated.
--
-- Operator reach is limited to organizations nobody has claimed yet:
-- provisioned_at set, claimed_at NULL, and zero active members. Every write
-- takes the organization row lock first; claim_provisioned_memberships takes the
-- same lock, so an operator edit and a claim never interleave.

-- =============================================================================
-- Attribution and idempotency
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioning_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_provisioning_request_id
  ON public.organizations (provisioning_request_id)
  WHERE provisioning_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_provisioned_by
  ON public.organizations (provisioned_by);

COMMENT ON COLUMN public.organizations.provisioned_by IS
  'Operator (EquipQR staff user) who provisioned this Done-For-You organization.';
COMMENT ON COLUMN public.organizations.provisioning_request_id IS
  'Client-generated idempotency key for in-app provisioning; a retried request returns the same organization.';

ALTER TABLE public.organization_provisioned_members
  ADD COLUMN IF NOT EXISTS staged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_provisioned_members_staged_by
  ON public.organization_provisioned_members (staged_by);

-- =============================================================================
-- Operator reach: unclaimed organizations only
-- =============================================================================

CREATE OR REPLACE FUNCTION public.org_is_operator_editable(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_organization_id
      AND o.provisioned_at IS NOT NULL
      AND o.claimed_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = o.id
          AND om.status = 'active'
      )
  );
$$;

COMMENT ON FUNCTION public.org_is_operator_editable(uuid) IS
  'True while a provisioned organization has never been claimed and has no active members. Operators may read or edit it only then.';

CREATE OR REPLACE FUNCTION public.assert_org_operator_editable(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM 1 FROM public.organizations o WHERE o.id = p_organization_id FOR UPDATE;

  IF NOT public.org_is_operator_editable(p_organization_id) THEN
    RAISE EXCEPTION 'ORG_NOT_EDITABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Operators can change a provisioned organization only before anyone has joined it.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.operator_verified_account_emails(p_emails text[])
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT public.normalize_email(u.email)
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND public.normalize_email(u.email) = ANY (
      SELECT public.normalize_email(e) FROM unnest(p_emails) AS e
    );
$$;

COMMENT ON FUNCTION public.operator_verified_account_emails(text[]) IS
  'Which of these emails already belong to a verified account (staging them attaches that account immediately).';

-- =============================================================================
-- Internal: stage one person with attribution and the existing-account guard
-- =============================================================================

CREATE OR REPLACE FUNCTION public.operator_stage_member(
  p_operator_id uuid,
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_team_id uuid DEFAULT NULL,
  p_team_role public.team_member_role DEFAULT NULL,
  p_attach_existing boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.assert_org_operator_editable(p_organization_id);

  IF NOT p_attach_existing AND EXISTS (
    SELECT 1 FROM public.operator_verified_account_emails(ARRAY[p_email])
  ) THEN
    RAISE EXCEPTION 'EXISTING_ACCOUNT'
      USING ERRCODE = '22023',
            DETAIL = format('%s already has a verified EquipQR account and would be attached immediately.', public.normalize_email(p_email));
  END IF;

  v_id := public.stage_provisioned_member(p_organization_id, p_email, p_role, p_team_id, p_team_role);

  UPDATE public.organization_provisioned_members
  SET staged_by = p_operator_id
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- =============================================================================
-- Create: one transaction, idempotent per request
-- =============================================================================

CREATE OR REPLACE FUNCTION public.provision_organization(
  p_request_id uuid,
  p_operator_id uuid,
  p_name text,
  p_team_name text,
  p_staff jsonb,
  p_equipment jsonb,
  p_attach_existing_emails text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id uuid;
  v_existing_operator uuid;
  v_team_id uuid;
  v_staff jsonb;
  v_email text;
  v_team_role text;
  v_attach text[];
  v_staged_id uuid;
BEGIN
  IF p_request_id IS NULL OR p_operator_id IS NULL THEN
    RAISE EXCEPTION 'request id and operator id are required' USING ERRCODE = '22023';
  END IF;

  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Organization name is required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_staff) IS DISTINCT FROM 'array'
    OR (SELECT count(*) FROM jsonb_array_elements(p_staff) s WHERE s->>'role' = 'owner') <> 1 THEN
    RAISE EXCEPTION 'Staff must include exactly one owner' USING ERRCODE = '22023';
  END IF;

  IF p_equipment IS NOT NULL AND jsonb_typeof(p_equipment) <> 'array' THEN
    RAISE EXCEPTION 'Equipment must be an array' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: a retried request returns the organization it already made.
  SELECT o.id, o.provisioned_by INTO v_org_id, v_existing_operator
  FROM public.organizations o
  WHERE o.provisioning_request_id = p_request_id;

  IF v_org_id IS NOT NULL THEN
    IF v_existing_operator IS DISTINCT FROM p_operator_id THEN
      RAISE EXCEPTION 'Request id already used' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object('organization_id', v_org_id, 'created', false);
  END IF;

  SELECT array_agg(public.normalize_email(e)) INTO v_attach
  FROM unnest(coalesce(p_attach_existing_emails, '{}'::text[])) AS e;

  INSERT INTO public.organizations (
    name, plan, member_count, max_members, provisioned_at, provisioned_by, provisioning_request_id
  )
  VALUES (
    btrim(p_name),
    'free',
    0,
    GREATEST(5, jsonb_array_length(p_staff)),
    now(),
    p_operator_id,
    p_request_id
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.teams (organization_id, name)
  VALUES (v_org_id, COALESCE(NULLIF(btrim(p_team_name), ''), 'Main Yard'))
  RETURNING id INTO v_team_id;

  IF p_equipment IS NOT NULL AND jsonb_array_length(p_equipment) > 0 THEN
    INSERT INTO public.equipment (
      organization_id, team_id, name, manufacturer, model, serial_number,
      location, installation_date, status, notes, import_id
    )
    SELECT
      v_org_id,
      v_team_id,
      btrim(e.name),
      COALESCE(btrim(e.manufacturer), ''),
      COALESCE(btrim(e.model), ''),
      COALESCE(btrim(e.serial_number), ''),
      COALESCE(NULLIF(btrim(e.location), ''), 'Yard'),
      COALESCE(e.installation_date, current_date),
      COALESCE(NULLIF(e.status, ''), 'active')::public.equipment_status,
      NULLIF(btrim(e.notes), ''),
      NULLIF(btrim(e.import_id), '')
    FROM jsonb_to_recordset(p_equipment) AS e(
      name text, manufacturer text, model text, serial_number text, location text,
      installation_date date, status text, notes text, import_id text
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.operator_verified_account_emails(
      ARRAY(SELECT s->>'email' FROM jsonb_array_elements(p_staff) s)
    ) AS existing(email)
    WHERE existing.email <> ALL (coalesce(v_attach, '{}'::text[]))
  ) THEN
    RAISE EXCEPTION 'EXISTING_ACCOUNT'
      USING ERRCODE = '22023',
            DETAIL = 'One or more staff emails already have a verified EquipQR account; confirm attaching them.';
  END IF;

  -- Existing verified accounts are attached the moment they are staged, so
  -- stage everyone else first.
  FOR v_staff IN
    SELECT s
    FROM jsonb_array_elements(p_staff) AS s
    ORDER BY (public.normalize_email(s->>'email') = ANY (coalesce(v_attach, '{}'::text[])))
  LOOP
    v_email := public.normalize_email(v_staff->>'email');
    v_team_role := NULLIF(v_staff->>'team_role', '');

    v_staged_id := public.stage_provisioned_member(
      v_org_id,
      v_email,
      v_staff->>'role',
      CASE WHEN v_team_role IS NULL THEN NULL ELSE v_team_id END,
      v_team_role::public.team_member_role
    );

    UPDATE public.organization_provisioned_members
    SET staged_by = p_operator_id
    WHERE id = v_staged_id;
  END LOOP;

  RETURN jsonb_build_object('organization_id', v_org_id, 'team_id', v_team_id, 'created', true);
EXCEPTION WHEN unique_violation THEN
  -- A concurrent retry of the same request won the insert.
  IF EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.provisioning_request_id = p_request_id
      AND o.provisioned_by = p_operator_id
  ) THEN
    RETURN jsonb_build_object(
      'organization_id',
      (SELECT o.id FROM public.organizations o WHERE o.provisioning_request_id = p_request_id),
      'created', false
    );
  END IF;
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.provision_organization(uuid, uuid, text, text, jsonb, jsonb, text[]) IS
  'Operator tooling (service role): creates a Done-For-You organization with its team, equipment, and staged staff in one transaction. Idempotent per p_request_id.';

-- =============================================================================
-- Read and edit while unclaimed
-- =============================================================================

CREATE OR REPLACE FUNCTION public.operator_list_unclaimed_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  provisioned_at timestamptz,
  provisioned_by uuid,
  pending_staff bigint,
  equipment_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    o.id,
    o.name,
    o.provisioned_at,
    o.provisioned_by,
    (SELECT count(*) FROM public.organization_provisioned_members pm
      WHERE pm.organization_id = o.id AND pm.status = 'pending'),
    (SELECT count(*) FROM public.equipment e WHERE e.organization_id = o.id)
  FROM public.organizations o
  WHERE public.org_is_operator_editable(o.id)
  ORDER BY o.provisioned_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.operator_get_organization(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.org_is_operator_editable(p_organization_id) THEN
    RAISE EXCEPTION 'ORG_NOT_EDITABLE' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'organization', (
      SELECT jsonb_build_object('id', o.id, 'name', o.name, 'provisioned_at', o.provisioned_at)
      FROM public.organizations o WHERE o.id = p_organization_id
    ),
    'teams', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) ORDER BY t.created_at)
      FROM public.teams t WHERE t.organization_id = p_organization_id
    ), '[]'::jsonb),
    'staff', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pm.id, 'email', pm.email, 'role', pm.role, 'team_role', pm.team_role, 'status', pm.status
      ) ORDER BY pm.created_at)
      FROM public.organization_provisioned_members pm
      WHERE pm.organization_id = p_organization_id AND pm.status <> 'revoked'
    ), '[]'::jsonb),
    'equipment', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'name', e.name, 'manufacturer', e.manufacturer, 'model', e.model,
        'serial_number', e.serial_number, 'location', e.location
      ) ORDER BY e.name)
      FROM public.equipment e WHERE e.organization_id = p_organization_id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.operator_revoke_staged_member(
  p_operator_id uuid,
  p_staged_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.organization_provisioned_members
  WHERE id = p_staged_member_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Staged member not found' USING ERRCODE = '22023';
  END IF;

  PERFORM public.assert_org_operator_editable(v_org_id);

  UPDATE public.organization_provisioned_members
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = p_operator_id
  WHERE id = p_staged_member_id
    AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.operator_add_equipment(
  p_operator_id uuid,
  p_organization_id uuid,
  p_equipment jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id uuid;
  v_count integer;
BEGIN
  PERFORM public.assert_org_operator_editable(p_organization_id);

  IF jsonb_typeof(p_equipment) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Equipment must be an array' USING ERRCODE = '22023';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.organization_id = p_organization_id
  ORDER BY t.created_at
  LIMIT 1;

  INSERT INTO public.equipment (
    organization_id, team_id, name, manufacturer, model, serial_number,
    location, installation_date, status, notes, import_id
  )
  SELECT
    p_organization_id,
    v_team_id,
    btrim(e.name),
    COALESCE(btrim(e.manufacturer), ''),
    COALESCE(btrim(e.model), ''),
    COALESCE(btrim(e.serial_number), ''),
    COALESCE(NULLIF(btrim(e.location), ''), 'Yard'),
    COALESCE(e.installation_date, current_date),
    COALESCE(NULLIF(e.status, ''), 'active')::public.equipment_status,
    NULLIF(btrim(e.notes), ''),
    NULLIF(btrim(e.import_id), '')
  FROM jsonb_to_recordset(p_equipment) AS e(
    name text, manufacturer text, model text, serial_number text, location text,
    installation_date date, status text, notes text, import_id text
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.operator_delete_equipment(
  p_operator_id uuid,
  p_organization_id uuid,
  p_equipment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_org_operator_editable(p_organization_id);

  DELETE FROM public.equipment
  WHERE id = p_equipment_id
    AND organization_id = p_organization_id;
END;
$$;

-- =============================================================================
-- Service role only
-- =============================================================================

DO $grants$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.org_is_operator_editable(uuid)',
    'public.assert_org_operator_editable(uuid)',
    'public.operator_verified_account_emails(text[])',
    'public.operator_stage_member(uuid, uuid, text, text, uuid, public.team_member_role, boolean)',
    'public.provision_organization(uuid, uuid, text, text, jsonb, jsonb, text[])',
    'public.operator_list_unclaimed_organizations()',
    'public.operator_get_organization(uuid)',
    'public.operator_revoke_staged_member(uuid, uuid)',
    'public.operator_add_equipment(uuid, uuid, jsonb)',
    'public.operator_delete_equipment(uuid, uuid, uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$grants$;
