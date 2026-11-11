-- Log Completed (historical paper backlog) guardrails.
--
-- 1. work_orders.quickbooks_sync_excluded: "Historical Only / Do Not Sync" flag so
--    already-billed paper records never land in the unbilled queue or get exported
--    to QuickBooks a second time. Historical inserts default to excluded (fail-safe);
--    callers opt in with an explicit UPDATE to false.
-- 2. log_work_order_service_hours: record the meter reading taken at service time on
--    the work order, its PM record and the hour history, and advance the equipment's
--    master working hours only when the reading is higher than the current value.
-- 3. sync_equipment_last_maintenance_from_work_order also runs on INSERT so a PM
--    work order created directly in completed status moves equipment.last_maintenance
--    forward (never backward) to its completed date.
--
-- rpc-authenticated-grant-allowed: bulk-lockdown (re-lock block at the end; see dev/security-definer-rpc-allowlists.json)
--
-- Non-breaking: existing rows keep quickbooks_sync_excluded = false and no existing
-- function signature changes.

-- ============================================================================
-- 1. QuickBooks "do not sync" flag
-- ============================================================================

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS quickbooks_sync_excluded boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.work_orders.quickbooks_sync_excluded IS
  'When true the work order is a historical/already-billed record: it is hidden from the "not exported" invoice queue and the QuickBooks export function refuses it.';

CREATE OR REPLACE FUNCTION public.default_historical_quickbooks_exclusion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.is_historical IS TRUE THEN
    NEW.quickbooks_sync_excluded := true;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.default_historical_quickbooks_exclusion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.default_historical_quickbooks_exclusion() FROM anon;
REVOKE ALL ON FUNCTION public.default_historical_quickbooks_exclusion() FROM authenticated;

DROP TRIGGER IF EXISTS tr_default_historical_quickbooks_exclusion ON public.work_orders;

CREATE TRIGGER tr_default_historical_quickbooks_exclusion
BEFORE INSERT ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.default_historical_quickbooks_exclusion();

-- ============================================================================
-- 2. Guarded service-hours logging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_work_order_service_hours(
  p_work_order_id uuid,
  p_hours numeric,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_org_id uuid;
  v_equipment_id uuid;
  v_current_hours numeric;
  v_user_name text;
  v_advanced boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_hours IS NULL OR p_hours < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hours must be a non-negative number');
  END IF;

  SELECT wo.organization_id, wo.equipment_id
  INTO v_org_id, v_equipment_id
  FROM public.work_orders wo
  WHERE wo.id = p_work_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  -- Same access rule as update_equipment_working_hours.
  IF NOT (
    public.is_org_operational_admin(auth.uid(), v_org_id)
    OR (
      public.is_org_member(auth.uid(), v_org_id)
      AND EXISTS (
        SELECT 1
        FROM public.equipment e
        WHERE e.id = v_equipment_id
          AND e.team_id IS NOT NULL
          AND e.team_id IN (
            SELECT tm.team_id
            FROM public.team_members tm
            WHERE tm.user_id = auth.uid()
          )
      )
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Lock the equipment row so concurrent entries cannot roll the meter back.
  SELECT e.working_hours
  INTO v_current_hours
  FROM public.equipment e
  WHERE e.id = v_equipment_id
    AND e.organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Equipment not found');
  END IF;

  v_advanced := v_current_hours IS NULL OR p_hours > v_current_hours;

  UPDATE public.work_orders
  SET equipment_working_hours_at_creation = p_hours
  WHERE id = p_work_order_id;

  -- Hour-based PM intervals are measured from the reading at the service itself.
  UPDATE public.preventative_maintenance
  SET equipment_working_hours_at_completion = p_hours
  WHERE work_order_id = p_work_order_id
    AND organization_id = v_org_id
    AND status = 'completed';

  IF v_advanced THEN
    UPDATE public.equipment
    SET working_hours = p_hours,
        updated_at = now()
    WHERE id = v_equipment_id
      AND organization_id = v_org_id;
  END IF;

  SELECT p.name INTO v_user_name FROM public.profiles p WHERE p.id = auth.uid();

  -- A reading at or below the current meter is logged without changing it:
  -- old_hours = new_hours and the reading itself is kept in the note.
  INSERT INTO public.equipment_working_hours_history (
    equipment_id,
    old_hours,
    new_hours,
    hours_added,
    updated_by,
    updated_by_name,
    update_source,
    work_order_id,
    notes
  ) VALUES (
    v_equipment_id,
    v_current_hours,
    CASE WHEN v_advanced THEN p_hours ELSE v_current_hours END,
    CASE WHEN v_advanced THEN p_hours - COALESCE(v_current_hours, 0) ELSE 0 END,
    auth.uid(),
    v_user_name,
    'work_order',
    p_work_order_id,
    CASE
      WHEN v_advanced THEN COALESCE(p_notes, 'Service reading logged from work order')
      ELSE concat(
        'Historical service reading of ', p_hours::text,
        ' hrs logged; current hours unchanged.',
        CASE WHEN p_notes IS NOT NULL THEN ' ' || p_notes ELSE '' END
      )
    END
  );

  RETURN jsonb_build_object(
    'success', true,
    'logged_hours', p_hours,
    'previous_hours', v_current_hours,
    'equipment_hours_updated', v_advanced
  );
END;
$function$;

-- rpc-authenticated-grant-allowed: log_work_order_service_hours
REVOKE ALL ON FUNCTION public.log_work_order_service_hours(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_work_order_service_hours(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_work_order_service_hours(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_work_order_service_hours(uuid, numeric, text) TO service_role;

-- ============================================================================
-- 3. Last maintenance also follows PM work orders inserted as completed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_equipment_last_maintenance_from_work_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_completed_date date;
  v_existing date;
  v_became_completed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_became_completed := NEW.status = 'completed';
  ELSIF TG_OP = 'UPDATE' THEN
    v_became_completed := NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status);
  ELSE
    RETURN NEW;
  END IF;

  IF v_became_completed THEN
    IF NEW.equipment_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.has_pm IS TRUE OR NEW.pm_required IS TRUE THEN
      IF NEW.completed_date IS NULL THEN
        RETURN NEW;
      END IF;

      v_completed_date := NEW.completed_date::date;

      SELECT last_maintenance
      INTO v_existing
      FROM public.equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;

      IF v_existing IS NULL OR v_completed_date > v_existing THEN
        UPDATE public.equipment
        SET last_maintenance = v_completed_date,
            last_maintenance_work_order_id = NEW.id,
            updated_at = now()
        WHERE id = NEW.equipment_id
          AND organization_id = NEW.organization_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_sync_equipment_last_maintenance ON public.work_orders;

CREATE TRIGGER tr_sync_equipment_last_maintenance
AFTER INSERT OR UPDATE OF status, completed_date ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_equipment_last_maintenance_from_work_order();

-- ============================================================================
-- 4. Re-lock SECURITY DEFINER grants with log_work_order_service_hours allowlisted
--    (same block as 20261016150000 plus the new function).
-- ============================================================================

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
    'log_work_order_service_hours',
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
