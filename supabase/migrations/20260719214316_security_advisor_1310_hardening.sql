-- rpc-anon-grant-allowed: get_invitation_by_token_secure, resolve_operator_checkin_by_token, resolve_quick_form_by_token
-- rpc-authenticated-grant-allowed: bulk-relockdown (see scripts/security-definer-rpc-allowlists.json)
-- ============================================================================
-- Migration: Security Advisor hardening (issue #1310)
--
-- Fixes:
--   1. Drop broad SELECT policies on public storage buckets (listing not required
--      for public object URL access).
--   2. Pin search_path on datadog.explain_statement when the Datadog schema exists.
--   3. Re-lock SECURITY DEFINER EXECUTE grants (post-#762 drift from
--      ALTER DEFAULT PRIVILEGES … GRANT ALL ON FUNCTIONS TO anon/authenticated).
--   4. Revoke PUBLIC/anon EXECUTE from all public functions (INVOKER + DEFINER),
--      then re-grant authenticated on non-trigger INVOKER RPCs and allowlisted
--      DEFINER RPCs. Intentional anon surface remains the three token RPCs.
--   5. Stop default-granting new public functions to anon/authenticated so
--      future CREATE FUNCTION stays deny-by-default.
--
-- Allowlists must match scripts/security-definer-rpc-allowlists.json
-- (validated by scripts/validate-security-definer-allowlist-sync.mjs).
--
-- Down:
--   Re-create the four SELECT policies; revert default privileges; re-run prior
--   lockdown migration pattern if needed. Datadog search_path change is safe to leave.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1) Public buckets: remove listing-capable SELECT policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "docs_media_select" ON storage.objects;
DROP POLICY IF EXISTS "landing_page_images_select" ON storage.objects;
DROP POLICY IF EXISTS "landing_page_videos_select" ON storage.objects;
DROP POLICY IF EXISTS "org_logos_select" ON storage.objects;

-- -----------------------------------------------------------------------------
-- 2) Datadog monitoring helper (production only; no-op locally if missing)
-- -----------------------------------------------------------------------------

DO $datadog$
DECLARE
  fn regprocedure;
BEGIN
  -- Identity args only (OUT params are not part of the identity signature).
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'datadog'
      AND p.proname = 'explain_statement'
      AND pg_get_function_identity_arguments(p.oid) = 'l_query text'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = datadog, public',
      fn
    );
  END LOOP;
END;
$datadog$;

-- -----------------------------------------------------------------------------
-- 3) Deny-by-default for future functions created by postgres
-- -----------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

-- -----------------------------------------------------------------------------
-- 4) Re-lock public REST surface (anon + SECURITY DEFINER allowlists)
-- -----------------------------------------------------------------------------

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
  -- Anon surface lockdown (INVOKER + DEFINER): revoke PUBLIC/anon from every
  -- public function first. Do NOT filter on prosecdef here — INVOKER RPCs that
  -- inherited default grants must lose anon EXECUTE too.
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

  -- DEFINER-only: deny authenticated by default; allowlists re-open below.
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

  -- INVOKER trigger helpers must not be REST-callable.
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

  -- Client-callable SECURITY INVOKER RPCs only (not internal helpers such as
  -- storage_object_path_segment_uuid / normalize_* / synthesize_*).
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

  -- Grant every SECURITY DEFINER overload for allowlisted names. Clients may
  -- omit optional args (undefined → older PostgREST overload); restricting to
  -- max(oid) broke create_historical_work_order_with_pm without p_timeline_events.
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

COMMENT ON SCHEMA public IS
  'EquipQR application schema. SECURITY DEFINER EXECUTE grants follow docs/ops/security-definer-rpc-policy.md (issues #762, #1310).';
