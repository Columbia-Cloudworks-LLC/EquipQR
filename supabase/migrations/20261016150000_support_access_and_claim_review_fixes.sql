-- rpc-anon-grant-allowed: get_invitation_by_token_secure, resolve_operator_checkin_by_token, resolve_quick_form_by_token
-- rpc-authenticated-grant-allowed: bulk-relockdown (see dev/security-definer-rpc-allowlists.json)
-- ============================================================================
-- Follow-up review fixes for PR #1658:
--   1. Keep team_members write policies restricted to permanent active admins
--      (public.is_org_admin) while team_members_select continues to allow live
--      support via public.is_org_member.
--   2. Add public.reconcile_support_operators(uuid[]) so shrinking or clearing
--      DFY_OPERATOR_USER_IDS immediately removes offboarded operators' live
--      support memberships across all organizations and closes any grant with
--      no remaining operators.
--   3. Reconcile non-active existing memberships and visibly reject active
--      non-admin operator collisions in public.grant_support_access.
--   4. Recover failed verified-at-insert DFY claims with a fallback personal
--      organization and retry pending claims on subsequent sign-ins.
-- ============================================================================

DO $restore_team_members_write_policies$
DECLARE
  pol record;
  alter_sql text;
BEGIN
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
END;
$restore_team_members_write_policies$;

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
    v_expires_at := GREATEST(v_open.expires_at, v_expires_at);
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
  v_failed boolean := false;
BEGIN
  SELECT public.normalize_email(u.email), u.email_confirmed_at
  INTO v_email, v_confirmed_at
  FROM auth.users u
  WHERE u.id = p_user_id;

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
    BEGIN
      PERFORM 1 FROM public.organizations o WHERE o.id = v_row.organization_id FOR UPDATE;

      PERFORM 1
      FROM public.organization_provisioned_members pm
      WHERE pm.id = v_row.id
        AND pm.status = 'pending'
      FOR UPDATE;
      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      v_role := v_row.role;

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
      v_failed := true;
      UPDATE public.organization_provisioned_members
      SET last_claim_error = left(SQLERRM, 500)
      WHERE id = v_row.id;
      RAISE WARNING 'claim_provisioned_memberships: staged row % not claimed: %', v_row.id, SQLERRM;
    END;
  END LOOP;

  IF v_failed
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = p_user_id
        AND om.status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.personal_organizations po
      WHERE po.user_id = p_user_id
    )
  THEN
    BEGIN
      PERFORM public.ensure_personal_organization(p_user_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'claim_provisioned_memberships: fallback personal org for % failed: %', p_user_id, SQLERRM;
    END;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_provisioned_memberships(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_provisioned_memberships(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.claim_provisioned_memberships(NEW.id);

  IF NOT EXISTS (
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

REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM anon;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed_claim() FROM authenticated;

DO $$
BEGIN
  BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_email_confirmed_claim ON auth.users;

    CREATE TRIGGER on_auth_user_email_confirmed_claim
      AFTER UPDATE OF email, email_confirmed_at, last_sign_in_at ON auth.users
      FOR EACH ROW
      WHEN (
        NEW.email_confirmed_at IS NOT NULL
        AND (
          OLD.email_confirmed_at IS NULL
          OR OLD.email IS DISTINCT FROM NEW.email
          OR NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at
        )
      )
      EXECUTE FUNCTION public.handle_user_email_confirmed_claim();
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Insufficient privileges to create trigger on_auth_user_email_confirmed_claim on auth.users.';
  END;
END $$;

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
