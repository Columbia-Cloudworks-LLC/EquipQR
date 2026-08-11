-- rpc-anon-grant-allowed: get_invitation_by_token_secure, resolve_operator_checkin_by_token, resolve_quick_form_by_token
-- rpc-authenticated-grant-allowed: create_historical_work_order_with_pm, bulk_set_compatibility_rules, bulk_set_pm_template_rules, get_alternates_for_inventory_item, get_alternates_for_part_number, get_compatible_parts_for_equipment, get_compatible_parts_for_make_model, get_matching_pm_templates, list_pm_templates, latest_scans_for_equipment_ids, get_fleet_efficiency, count_equipment_matching_rules, count_equipment_matching_pm_rules, get_equipment_for_inventory_item_rules, can_manage_inventory, is_parts_manager, can_access_inventory, assert_inventory_read_access, get_inventory_list_metadata, is_parts_consumer, get_global_pm_template_names, get_current_billing_period, check_export_rate_limit, monitoring_healthcheck, historical_timeline_allowed_next_statuses
-- ============================================================================
-- Follow-up for issue #1310:
--   1) Re-assert anon surface = three token RPCs (INVOKER + DEFINER).
--   2) Narrow authenticated EXECUTE on SECURITY INVOKER to an explicit client
--      allowlist (undo blanket grant that re-opened internal helpers such as
--      storage_object_path_segment_uuid).
--   3) Re-assert authenticated EXECUTE on every create_historical_work_order_with_pm
--      overload.
-- ============================================================================

DO $anon_relock$
DECLARE
  fn regprocedure;
  func_name text;
  anon_allowlist text[] := ARRAY[
    'get_invitation_by_token_secure',
    'resolve_operator_checkin_by_token',
    'resolve_quick_form_by_token'
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
  -- Revoke PUBLIC/anon from every public function (INVOKER + DEFINER).
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

  -- Strip authenticated from all non-trigger INVOKER, then re-open allowlist only.
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT p.prosecdef
      AND pg_get_function_result(p.oid) <> 'trigger'
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

  -- Intentional three-token anon surface (all overloads).
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

  -- Historical WO: every SECURITY DEFINER overload stays authenticated-callable.
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND p.proname = 'create_historical_work_order_with_pm'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$anon_relock$;
