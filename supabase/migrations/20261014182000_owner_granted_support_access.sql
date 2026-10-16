-- Owner-granted, time-limited EquipQR Support access (issue #1648 review).
--
-- There is no platform-wide admin. EquipQR operators reach a customer's data
-- only while that organization's owner has a live support grant for it.
--
-- Model:
--   * organization_support_grants: one row per grant (who granted it, when it
--     expires, whether it was revoked). At most one unrevoked grant per org.
--   * Each operator gets an organization_members row with role 'admin',
--     status 'support', access_source 'support', and support_grant_id.
--
-- Why status 'support' and not 'active': existing access checks test
-- status = 'active' in many places (RLS policies, SQL functions, Edge
-- Functions, the client). A separate status makes support access fail closed:
-- only the helpers below opt in, and each of them checks the grant's expiry at
-- query time. Member counts, member limits, billing, and Google Workspace
-- reconciliation all key on status 'active' / access_source, so support rows
-- are excluded from them without further changes.
--
-- Support admins can read and edit organization data (equipment, work orders,
-- teams, inventory, PM). They are excluded from membership writes
-- (user_is_org_admin is unchanged), invitations (guard trigger below),
-- ownership, billing, and QuickBooks / Google credentials (those checks stay
-- status = 'active').

-- =============================================================================
-- Grants
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_support_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL,
  ticket_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_support_grants_source_check
    CHECK (source = ANY (ARRAY['settings'::text, 'bug_report'::text])),
  CONSTRAINT organization_support_grants_expiry_check
    CHECK (expires_at > granted_at AND expires_at <= granted_at + interval '7 days 1 minute')
);

COMMENT ON TABLE public.organization_support_grants IS
  'Owner-granted, time-limited EquipQR Support access to one organization. Access ends at expires_at or revoked_at, enforced by the access helpers at query time.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_support_grants_one_open
  ON public.organization_support_grants (organization_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_support_grants_org
  ON public.organization_support_grants (organization_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_support_grants_granted_by
  ON public.organization_support_grants (granted_by);
CREATE INDEX IF NOT EXISTS idx_org_support_grants_revoked_by
  ON public.organization_support_grants (revoked_by);

DROP TRIGGER IF EXISTS update_organization_support_grants_updated_at
  ON public.organization_support_grants;
CREATE TRIGGER update_organization_support_grants_updated_at
  BEFORE UPDATE ON public.organization_support_grants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.organization_support_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_support_grants FROM PUBLIC;
REVOKE ALL ON TABLE public.organization_support_grants FROM anon;
REVOKE ALL ON TABLE public.organization_support_grants FROM authenticated;
GRANT SELECT ON TABLE public.organization_support_grants TO authenticated;
GRANT ALL ON TABLE public.organization_support_grants TO service_role;

-- =============================================================================
-- Liveness: the single expiry check every helper uses
-- =============================================================================

CREATE OR REPLACE FUNCTION public.support_grant_is_live(p_grant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_support_grants g
    WHERE g.id = p_grant_id
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
  );
$$;

COMMENT ON FUNCTION public.support_grant_is_live(uuid) IS
  'True while a support grant is neither revoked nor expired. RLS predicate helper.';

REVOKE ALL ON FUNCTION public.support_grant_is_live(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.support_grant_is_live(uuid) FROM anon;
-- rpc-authenticated-grant-allowed: support_grant_is_live
GRANT EXECUTE ON FUNCTION public.support_grant_is_live(uuid) TO authenticated, service_role;

-- Owners and admins (including live support admins) can review grants.
DROP POLICY IF EXISTS organization_support_grants_select ON public.organization_support_grants;
CREATE POLICY organization_support_grants_select
  ON public.organization_support_grants
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin((SELECT auth.uid()), organization_id));

-- =============================================================================
-- Support memberships
-- =============================================================================

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS support_grant_id uuid
    REFERENCES public.organization_support_grants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_organization_members_support_grant_id
  ON public.organization_members (support_grant_id);

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_support_shape_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_support_shape_check
  CHECK (
    (COALESCE(access_source, '') = 'support') = (status = 'support')
    AND (status = 'support') = (support_grant_id IS NOT NULL)
    AND (status <> 'support' OR role = 'admin')
  );

-- Support rows are written only by grant_support_access, which sets this flag
-- for its own transaction. Deleting one (revoke, or removing the member) is
-- always allowed.
CREATE OR REPLACE FUNCTION public.guard_support_memberships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (
    NEW.status = 'support'
    OR COALESCE(NEW.access_source, '') = 'support'
    OR (TG_OP = 'UPDATE' AND (OLD.status = 'support' OR COALESCE(OLD.access_source, '') = 'support'))
  ) AND current_setting('equipqr.support_access_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Support access can only be changed by the organization owner'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_support_memberships() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_support_memberships() FROM anon;
REVOKE ALL ON FUNCTION public.guard_support_memberships() FROM authenticated;

DROP TRIGGER IF EXISTS guard_support_memberships ON public.organization_members;
CREATE TRIGGER guard_support_memberships
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_support_memberships();

-- Expired or revoked support rows disappear from every direct query
-- (frontend membership lists, the org switcher, Edge Functions using a
-- user-scoped client) before any cleanup job runs.
DROP POLICY IF EXISTS organization_members_hide_dead_support ON public.organization_members;
CREATE POLICY organization_members_hide_dead_support
  ON public.organization_members
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (status <> 'support' OR public.support_grant_is_live(support_grant_id));

-- =============================================================================
-- Access helpers: accept a live support membership
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_org_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = user_uuid
      AND organization_id = org_id
      AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  );
$function$;

-- Shared permanent-admin predicates (is_org_admin, is_organization_admin,
-- user_is_org_admin) remain restricted to active owners/admins so non-operational
-- surfaces (organization settings/billing updates, public QR bearer token secrets,
-- invitations, member management, audit logs, bulk exports) never grant support.
-- Operational policies and RPCs opt into is_org_operational_admin explicitly.
CREATE OR REPLACE FUNCTION public.is_org_operational_admin(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = user_uuid
      AND organization_id = org_id
      AND role IN ('owner', 'admin')
      AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  );
$function$;

COMMENT ON FUNCTION public.is_org_operational_admin(uuid, uuid) IS
  'True for active org owners/admins and live owner-granted support sessions. Used only by operational policies and RPCs.';

REVOKE ALL ON FUNCTION public.is_org_operational_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_operational_admin(uuid, uuid) FROM anon;
-- rpc-authenticated-grant-allowed: is_org_operational_admin
GRANT EXECUTE ON FUNCTION public.is_org_operational_admin(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_organization_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid
      AND om.organization_id = org_id
      AND (om.status = 'active' OR (om.status = 'support' AND public.support_grant_is_live(om.support_grant_id)))
  );
$function$;

-- Owners and admins (including live support admins) can review grants.
DROP POLICY IF EXISTS organization_support_grants_select ON public.organization_support_grants;
CREATE POLICY organization_support_grants_select
  ON public.organization_support_grants
  FOR SELECT
  TO authenticated
  USING (public.is_org_operational_admin((SELECT auth.uid()), organization_id));

-- Opt operational RLS policies and operational RPCs into is_org_operational_admin
-- while leaving org settings/billing, public QR token secrets/management,
-- invitations, member management, audit logs, and bulk exports on is_org_admin.
DO $opt_support_into_operational$
DECLARE
  pol record;
  fn record;
  alter_sql text;
  func_def text;
  operational_tables text[] := ARRAY[
    'customer_contacts',
    'customer_sites',
    'customers',
    'equipment',
    'equipment_note_images',
    'equipment_notes',
    'equipment_working_hours_history',
    'external_customer_contacts',
    'inventory_item_images',
    'inventory_items',
    'notes',
    'organization_support_grants',
    'pm_checklist_templates',
    'pm_interval_policies',
    'pm_status_history',
    'preventative_maintenance',
    'scans',
    'teams',
    'work_order_costs',
    'work_order_notes',
    'work_order_status_history',
    'work_orders'
  ];
  operational_rpcs text[] := ARRAY[
    'can_access_work_order_costs',
    'can_edit_equipment_note',
    'can_edit_work_order_note',
    'can_manage_manual_external_customer_contact',
    'convert_work_order_to_historical',
    'create_historical_work_order_with_pm',
    'delete_equipment_note',
    'delete_equipment_note_image_audited',
    'delete_manual_external_customer_contact',
    'delete_work_order_cascade',
    'delete_work_order_note',
    'delete_work_order_note_image_audited',
    'get_dashboard_trends',
    'replace_historical_work_order_timeline',
    'revert_pm_completion',
    'revert_work_order_status',
    'update_equipment_note',
    'update_equipment_working_hours',
    'update_historical_work_order_note_timestamp',
    'update_manual_external_customer_contact',
    'update_work_order_note'
  ];
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (operational_tables)
      AND (
        COALESCE(qual, '') ~ '(^|[^a-zA-Z0-9_])is_org_admin\('
        OR COALESCE(with_check, '') ~ '(^|[^a-zA-Z0-9_])is_org_admin\('
      )
  LOOP
    alter_sql := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF pol.qual IS NOT NULL THEN
      alter_sql := alter_sql || format(
        ' USING (%s)',
        regexp_replace(pol.qual, '(^|[^a-zA-Z0-9_])is_org_admin\(', '\1is_org_operational_admin(', 'g')
      );
    END IF;
    IF pol.with_check IS NOT NULL THEN
      alter_sql := alter_sql || format(
        ' WITH CHECK (%s)',
        regexp_replace(pol.with_check, '(^|[^a-zA-Z0-9_])is_org_admin\(', '\1is_org_operational_admin(', 'g')
      );
    END IF;
    EXECUTE alter_sql;
  END LOOP;

  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (operational_rpcs)
  LOOP
    func_def := pg_get_functiondef(fn.oid);
    IF func_def ~ '(^|[^a-zA-Z0-9_])is_org_admin\(' THEN
      EXECUTE regexp_replace(
        func_def,
        '(^|[^a-zA-Z0-9_])is_org_admin\(',
        '\1is_org_operational_admin(',
        'g'
      );
    END IF;
  END LOOP;
END;
$opt_support_into_operational$;

-- Read access to the member list; user_is_org_admin (member writes) is
-- deliberately unchanged so support cannot manage people.
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid, check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = check_user_id
      AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_org_access_secure(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid
      AND organization_id = org_id
      AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  );
$function$;

CREATE OR REPLACE FUNCTION public.check_org_access_direct(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = user_uuid
      AND organization_id = org_id
      AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
RETURNS TABLE(organization_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = user_uuid
    AND (om.status = 'active' OR (om.status = 'support' AND public.support_grant_is_live(om.support_grant_id)));
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_role_secure(user_uuid uuid, org_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.organization_members
  WHERE user_id = user_uuid
    AND organization_id = org_id
    AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_role_direct(user_uuid uuid, org_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role
  FROM organization_members
  WHERE user_id = user_uuid
    AND organization_id = org_id
    AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organization_membership(user_uuid uuid)
RETURNS TABLE(organization_id uuid, role text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT om.organization_id, om.role, om.status
  FROM public.organization_members om
  WHERE om.user_id = user_uuid
    AND (om.status = 'active' OR (om.status = 'support' AND public.support_grant_is_live(om.support_grant_id)));
$function$;

CREATE OR REPLACE FUNCTION public.can_access_inventory(p_organization_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)));

  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;

  IF public.is_parts_manager(p_organization_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN public.is_parts_consumer(p_organization_id, p_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_inventory(p_organization_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id
  AND (status = 'active' OR (status = 'support' AND public.support_grant_is_live(support_grant_id)));

  -- Owners and admins can always manage inventory
  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a parts manager
  RETURN public.is_parts_manager(p_organization_id, p_user_id);
END;
$function$;

-- =============================================================================
-- Support admins cannot manage invitations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_support_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id
        AND om.user_id = v_user_id
        AND om.status = 'support'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id
        AND om.user_id = v_user_id
        AND om.status = 'active'
    )
  THEN
    RAISE EXCEPTION 'Support access cannot manage invitations' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_support_invitations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_support_invitations() FROM anon;
REVOKE ALL ON FUNCTION public.guard_support_invitations() FROM authenticated;

DROP TRIGGER IF EXISTS guard_support_invitations ON public.organization_invitations;
CREATE TRIGGER guard_support_invitations
  BEFORE INSERT OR UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.guard_support_invitations();

-- =============================================================================
-- Grant / extend (service role, via the support-access Edge Function)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_support_operators(p_operator_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_removed integer := 0;
BEGIN
  DELETE FROM public.organization_members om
  WHERE om.status = 'support'
    AND NOT (om.user_id = ANY (COALESCE(p_operator_ids, ARRAY[]::uuid[])));
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  UPDATE public.organization_support_grants g
  SET revoked_at = now()
  WHERE g.revoked_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = g.organization_id
        AND om.user_id = ANY (COALESCE(p_operator_ids, ARRAY[]::uuid[]))
        AND (
          (om.status = 'support' AND om.support_grant_id = g.id)
          OR (om.status = 'active' AND om.role IN ('owner', 'admin'))
        )
    );

  RETURN v_removed;
END;
$$;

COMMENT ON FUNCTION public.reconcile_support_operators(uuid[]) IS
  'Service role / config sync: immediately removes support memberships for users absent from the current DFY_OPERATOR_USER_IDS allowlist and closes any open grant with no remaining support operators.';

REVOKE ALL ON FUNCTION public.reconcile_support_operators(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_support_operators(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_support_operators(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_support_operators(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_support_access(
  p_organization_id uuid,
  p_granted_by uuid,
  p_operator_ids uuid[],
  p_duration_hours integer,
  p_source text,
  p_ticket_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grant_id uuid;
  v_expires_at timestamptz;
  v_open record;
  v_extended boolean := false;
  v_operator uuid;
  v_granted_count integer := 0;
BEGIN
  IF p_duration_hours NOT IN (24, 72, 168) THEN
    RAISE EXCEPTION 'Duration must be 24, 72, or 168 hours' USING ERRCODE = '22023';
  END IF;

  IF p_operator_ids IS NULL OR cardinality(p_operator_ids) = 0 THEN
    RAISE EXCEPTION 'No EquipQR Support accounts are configured' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.organizations o WHERE o.id = p_organization_id FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = p_granted_by
      AND om.role = 'owner'
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only the organization owner can grant support access' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = ANY (p_operator_ids)
      AND om.status = 'active'
      AND om.role NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Configured support operator already has a non-admin active membership in this organization'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ANY (p_operator_ids)
  ) THEN
    RAISE EXCEPTION 'No configured EquipQR Support accounts have an active profile'
      USING ERRCODE = '22023';
  END IF;

  v_expires_at := now() + make_interval(hours => p_duration_hours);

  SELECT g.id, g.expires_at INTO v_open
  FROM public.organization_support_grants g
  WHERE g.organization_id = p_organization_id
    AND g.revoked_at IS NULL
  FOR UPDATE;

  IF v_open.id IS NOT NULL AND v_open.expires_at > now() THEN
    -- Live grant: the owner's new choice replaces the remaining time.
    UPDATE public.organization_support_grants
    SET expires_at = v_expires_at,
        granted_at = now(),
        granted_by = p_granted_by,
        source = p_source,
        ticket_ref = COALESCE(p_ticket_ref, ticket_ref)
    WHERE id = v_open.id;
    v_grant_id := v_open.id;
    v_extended := true;
  ELSE
    IF v_open.id IS NOT NULL THEN
      -- Expired but never closed: close it at its expiry before opening a new one.
      UPDATE public.organization_support_grants
      SET revoked_at = expires_at
      WHERE id = v_open.id;
    END IF;

    INSERT INTO public.organization_support_grants (
      organization_id, granted_by, expires_at, source, ticket_ref
    )
    VALUES (p_organization_id, p_granted_by, v_expires_at, p_source, p_ticket_ref)
    RETURNING id INTO v_grant_id;
  END IF;

  PERFORM set_config('equipqr.support_access_write', 'on', true);

  -- Stale support rows, removed operators across all orgs, and non-active rows for target operators are replaced.
  DELETE FROM public.organization_members om
  WHERE (
    om.status = 'support'
    AND NOT (om.user_id = ANY (p_operator_ids))
  ) OR (
    om.organization_id = p_organization_id
    AND (
      (om.status = 'support' AND om.support_grant_id IS DISTINCT FROM v_grant_id)
      OR (om.user_id = ANY (p_operator_ids) AND om.status NOT IN ('active', 'support'))
    )
  );

  FOREACH v_operator IN ARRAY p_operator_ids
  LOOP
    INSERT INTO public.organization_members (
      organization_id, user_id, role, status, access_source, support_grant_id
    )
    SELECT p_organization_id, v_operator, 'admin', 'support', 'support', v_grant_id
    WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_operator)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'admin',
          status = 'support',
          access_source = 'support',
          support_grant_id = EXCLUDED.support_grant_id,
          can_manage_quickbooks = false
      WHERE public.organization_members.status <> 'active';
  END LOOP;

  PERFORM set_config('equipqr.support_access_write', 'off', true);

  PERFORM public.reconcile_support_operators(p_operator_ids);

  SELECT count(*)::integer INTO v_granted_count
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = ANY (p_operator_ids)
    AND (
      (om.status = 'support' AND om.support_grant_id = v_grant_id)
      OR (om.status = 'active' AND om.role IN ('owner', 'admin'))
    );

  IF v_granted_count = 0 THEN
    RAISE EXCEPTION 'No configured EquipQR Support accounts could be granted access'
      USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'grant_id', v_grant_id,
    'expires_at', v_expires_at,
    'extended', v_extended
  );
END;
$$;

COMMENT ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) IS
  'Service role (support-access Edge Function): the active owner grants or extends EquipQR Support admin access for 24, 72, or 168 hours.';

REVOKE ALL ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) TO service_role;

-- =============================================================================
-- Revoke (the owner, directly)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.revoke_support_access(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_revoked integer;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.role = 'owner'
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only the organization owner can revoke support access' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_support_grants
  SET revoked_at = now(),
      revoked_by = v_user_id
  WHERE organization_id = p_organization_id
    AND revoked_at IS NULL;
  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  DELETE FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND status = 'support';

  RETURN v_revoked > 0;
END;
$$;

COMMENT ON FUNCTION public.revoke_support_access(uuid) IS
  'The organization owner ends EquipQR Support access immediately.';

REVOKE ALL ON FUNCTION public.revoke_support_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_support_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_support_access(uuid) FROM authenticated;
-- rpc-authenticated-grant-allowed: revoke_support_access
GRANT EXECUTE ON FUNCTION public.revoke_support_access(uuid) TO authenticated, service_role;

-- =============================================================================
-- Status for the banner and settings card
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_support_access_status(p_organization_id uuid)
RETURNS TABLE (
  grant_id uuid,
  granted_at timestamptz,
  expires_at timestamptz,
  granted_by_name text,
  source text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT g.id, g.granted_at, g.expires_at, p.name, g.source
  FROM public.organization_support_grants g
  LEFT JOIN public.profiles p ON p.id = g.granted_by
  WHERE g.organization_id = p_organization_id
    AND g.revoked_at IS NULL
    AND g.expires_at > now()
    AND public.is_org_member((SELECT auth.uid()), p_organization_id);
$$;

COMMENT ON FUNCTION public.get_support_access_status(uuid) IS
  'The live EquipQR Support grant for an organization, visible to its members.';

REVOKE ALL ON FUNCTION public.get_support_access_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_support_access_status(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_support_access_status(uuid) FROM authenticated;
-- rpc-authenticated-grant-allowed: get_support_access_status
GRANT EXECUTE ON FUNCTION public.get_support_access_status(uuid) TO authenticated, service_role;

-- =============================================================================
-- Tidy-up (access already ended at expiry; this only removes the rows)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_support_access()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.organization_support_grants
  SET revoked_at = expires_at
  WHERE revoked_at IS NULL
    AND expires_at <= now();

  DELETE FROM public.organization_members om
  WHERE om.status = 'support'
    AND NOT public.support_grant_is_live(om.support_grant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_support_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_support_access() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_support_access() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_support_access() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-support-access') THEN
      PERFORM cron.unschedule('cleanup-expired-support-access');
    END IF;
    PERFORM cron.schedule(
      'cleanup-expired-support-access',
      '17 * * * *',
      'SELECT public.cleanup_expired_support_access();'
    );
  END IF;
END;
$$;
