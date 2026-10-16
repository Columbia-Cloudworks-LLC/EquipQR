-- rpc-anon-grant-allowed: get_invitation_by_token_secure, resolve_operator_checkin_by_token, resolve_quick_form_by_token
-- rpc-authenticated-grant-allowed: bulk-relockdown (see dev/security-definer-rpc-allowlists.json)
-- ============================================================================
-- Scope EquipQR Support admin access to operational surfaces only and prune
-- removed operators when extending a live support grant (PR #1658 review):
--   1. Keep public.is_org_admin and public.is_organization_admin restricted to
--      active permanent owners/admins (status = 'active') so org settings/
--      billing updates, public QR bearer token secrets, invitations, member
--      management, audit logs, and bulk exports never accept support.
--   2. Introduce public.is_org_operational_admin for operational RLS policies
--      and operational RPCs.
--   3. Reconcile removed operators out of organization_members when extending
--      a live grant via public.grant_support_access.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_admin(user_uuid uuid, org_id uuid)
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
      AND status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_organization_admin(user_uuid uuid, org_id uuid)
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
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$function$;

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

DROP POLICY IF EXISTS organization_support_grants_select ON public.organization_support_grants;
CREATE POLICY organization_support_grants_select
  ON public.organization_support_grants
  FOR SELECT
  TO authenticated
  USING (public.is_org_operational_admin((SELECT auth.uid()), organization_id));

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

  -- Keep team_members write policies restricted to permanent active admins.
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_members'
      AND (
        COALESCE(qual, '') ~ '(^|[^a-zA-Z0-9_])is_org_operational_admin\('
        OR COALESCE(with_check, '') ~ '(^|[^a-zA-Z0-9_])is_org_operational_admin\('
      )
  LOOP
    alter_sql := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF pol.qual IS NOT NULL THEN
      alter_sql := alter_sql || format(
        ' USING (%s)',
        regexp_replace(pol.qual, '(^|[^a-zA-Z0-9_])is_org_operational_admin\(', '\1is_org_admin(', 'g')
      );
    END IF;
    IF pol.with_check IS NOT NULL THEN
      alter_sql := alter_sql || format(
        ' WITH CHECK (%s)',
        regexp_replace(pol.with_check, '(^|[^a-zA-Z0-9_])is_org_operational_admin\(', '\1is_org_admin(', 'g')
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

REVOKE ALL ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_support_access(uuid, uuid, uuid[], integer, text, text) TO service_role;

DO $lockdown$
DECLARE
  fn regprocedure;
  func_name text;
  authenticated_allowlist text[] := ARRAY[
    'accept_invitation_atomic',
    'adjust_inventory_quantity',
    'apply_pending_admin_grants_for_user',
    'assert_inventory_read_access',
    'bulk_set_compatibility_rules',
    'bulk_set_pm_template_rules',
    'can_access_inventory',
    'can_access_work_order_costs',
    'can_manage_invitation_atomic',
    'can_manage_manual_external_customer_contact',
    'cancel_ownership_transfer',
    'check_admin_permission_safe',
    'check_storage_limit',
    'complete_product_onboarding',
    'convert_work_order_to_historical',
    'count_equipment_matching_pm_rules',
    'count_equipment_matching_rules',
    'create_google_workspace_oauth_session',
    'create_historical_work_order_with_pm',
    'create_invitation_atomic',
    'create_manual_external_customer_contact',
    'create_operator_checkin_assignment',
    'create_quick_form',
    'create_quickbooks_oauth_session',
    'create_workspace_organization_for_domain',
    'delete_equipment_note',
    'delete_equipment_note_image_audited',
    'delete_manual_external_customer_contact',
    'delete_operator_checklist_template',
    'delete_organization',
    'delete_work_order_cascade',
    'delete_work_order_note',
    'delete_work_order_note_image_audited',
    'disconnect_google_workspace',
    'disconnect_quickbooks',
    'enqueue_export_job',
    'export_equipment_csv_rows',
    'export_work_orders_csv_rows',
    'get_alternates_for_inventory_item',
    'get_alternates_for_part_number',
    'get_audit_log_timeline',
    'get_compatible_parts_for_equipment',
    'get_compatible_parts_for_make_model',
    'get_dashboard_trends',
    'get_effective_pm_interval_policy_for_equipment',
    'get_equipment_for_inventory_item_rules',
    'get_equipment_pm_status',
    'get_export_job_status',
    'get_google_workspace_connection_status',
    'get_inventory_list_metadata',
    'get_invitation_by_token_secure',
    'get_invitations_atomic',
    'get_latest_completed_pm',
    'get_matching_pm_templates',
    'get_org_equipment_pm_statuses',
    'get_organization_deletion_stats',
    'get_organization_storage_mb',
    'get_pending_transfer_requests',
    'get_pending_workspace_personal_org_merge_requests',
    'get_personal_org_merge_preview',
    'get_product_onboarding_status',
    'get_quickbooks_connection_status',
    'get_support_access_status',
    'get_user_invitations_safe',
    'get_user_org_role_direct',
    'get_user_quickbooks_permission',
    'get_user_team_memberships',
    'get_user_teams_for_notifications',
    'get_workspace_onboarding_state',
    'initiate_ownership_transfer',
    'is_parts_consumer',
    'latest_scans_for_equipment_ids',
    'leave_organization',
    'list_operator_checkin_restorable_template_ids',
    'log_audit_export_notification',
    'log_equipment_location_change',
    'log_invitation_performance',
    'refresh_quickbooks_tokens_manual',
    'replace_historical_work_order_timeline',
    'request_workspace_personal_org_merge',
    'reserve_slot_for_invitation',
    'resolve_operator_checkin_by_token',
    'resolve_quick_form_by_token',
    'respond_to_ownership_transfer',
    'respond_to_workspace_personal_org_merge',
    'restore_operator_checklist_template',
    'revert_pm_completion',
    'revert_work_order_status',
    'revoke_provisioned_member',
    'revoke_support_access',
    'rotate_operator_checkin_token',
    'rotate_quick_form_token',
    'select_google_workspace_members',
    'update_equipment_note',
    'update_equipment_working_hours',
    'update_historical_work_order_note_timestamp',
    'update_manual_external_customer_contact',
    'update_member_quickbooks_permission',
    'update_work_order_note',
    'validate_quickbooks_oauth_session'
  ];
  anon_allowlist text[] := ARRAY[
    'get_invitation_by_token_secure',
    'resolve_operator_checkin_by_token',
    'resolve_quick_form_by_token'
  ];
  rls_helper_allowlist text[] := ARRAY[
    'can_user_manage_quickbooks',
    'check_org_access_secure',
    'is_org_admin',
    'is_org_member',
    'is_org_operational_admin',
    'support_grant_is_live',
    'user_is_org_admin',
    'user_is_org_member'
  ];
  invoker_client_allowlist text[] := ARRAY[
    'assert_inventory_read_access',
    'bulk_set_compatibility_rules',
    'bulk_set_pm_template_rules',
    'can_access_inventory',
    'can_manage_inventory',
    'check_export_rate_limit',
    'count_equipment_matching_pm_rules',
    'count_equipment_matching_rules',
    'get_alternates_for_inventory_item',
    'get_alternates_for_part_number',
    'get_compatible_parts_for_equipment',
    'get_compatible_parts_for_make_model',
    'get_current_billing_period',
    'get_equipment_for_inventory_item_rules',
    'get_fleet_efficiency',
    'get_global_pm_template_names',
    'get_inventory_list_metadata',
    'get_matching_pm_templates',
    'historical_timeline_allowed_next_statuses',
    'is_parts_consumer',
    'is_parts_manager',
    'latest_scans_for_equipment_ids',
    'list_pm_templates',
    'monitoring_healthcheck'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
  END LOOP;

  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
  END LOOP;

  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT p.prosecdef
      AND pg_get_function_result(p.oid) = 'trigger'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
  END LOOP;

  FOREACH func_name IN ARRAY invoker_client_allowlist LOOP
    FOR fn IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND NOT p.prosecdef
        AND p.proname = func_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
  END LOOP;

  FOREACH func_name IN ARRAY authenticated_allowlist LOOP
    FOR fn IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosecdef
        AND p.proname = func_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
  END LOOP;

  FOREACH func_name IN ARRAY rls_helper_allowlist LOOP
    FOR fn IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosecdef
        AND p.proname = func_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
  END LOOP;

  FOREACH func_name IN ARRAY anon_allowlist LOOP
    FOR fn IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosecdef
        AND p.proname = func_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
  END LOOP;
END;
$lockdown$;
