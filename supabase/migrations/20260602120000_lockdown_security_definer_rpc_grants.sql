-- rpc-anon-grant-allowed: get_invitation_by_token_secure, resolve_operator_checkin_by_token, resolve_quick_form_by_token (bulk lockdown migration #762)
-- rpc-authenticated-grant-allowed: bulk-lockdown (see scripts/security-definer-rpc-allowlists.json)
-- ============================================================================
-- Migration: Lock down SECURITY DEFINER function EXECUTE grants (issue #762)
--
-- Problem: baseline grants left ~160 public SECURITY DEFINER functions callable
-- by anon via PostgREST /rest/v1/rpc, including trigger helpers and RBAC probes.
--
-- Approach:
--   1. Revoke PUBLIC/anon/authenticated on every public SECURITY DEFINER function.
--   2. Re-grant EXECUTE to authenticated for the explicit client RPC allowlist.
--   3. Re-grant EXECUTE to anon only for pre-auth invitation preview RPC.
--   service_role retains existing grants; trigger/cron bodies run as definer owner.
--
-- Allowlists are duplicated in scripts/security-definer-rpc-allowlists.json for
-- inventory generation and migration linting — keep them in sync.
-- ============================================================================

BEGIN;

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
    'cancel_ownership_transfer',
    'can_access_inventory',
    'can_manage_invitation_atomic',
    'check_admin_permission_safe',
    'check_storage_limit',
    'complete_product_onboarding',
    'count_equipment_matching_rules',
    'count_equipment_matching_pm_rules',
    'create_google_workspace_oauth_session',
    'create_historical_work_order_with_pm',
    'create_invitation_atomic',
    'create_quickbooks_oauth_session',
    'create_workspace_organization_for_domain',
    'delete_organization',
    'delete_work_order_cascade',
    'disconnect_google_workspace',
    'disconnect_quickbooks',
    'get_alternates_for_inventory_item',
    'get_alternates_for_part_number',
    'get_audit_log_timeline',
    'get_compatible_parts_for_equipment',
    'get_compatible_parts_for_make_model',
    'get_dashboard_trends',
    'get_equipment_for_inventory_item_rules',
    'get_effective_pm_interval_policy_for_equipment',
    'get_equipment_pm_status',
    'get_google_workspace_connection_status',
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
    'log_audit_export_notification',
    'log_equipment_location_change',
    'log_invitation_performance',
    'refresh_quickbooks_tokens_manual',
    'request_workspace_personal_org_merge',
    'replace_historical_work_order_timeline',
    'reserve_slot_for_invitation',
    'respond_to_ownership_transfer',
    'respond_to_workspace_personal_org_merge',
    'revert_pm_completion',
    'revert_work_order_status',
    'select_google_workspace_members',
    'update_equipment_working_hours',
    'update_member_quickbooks_permission',
    'validate_quickbooks_oauth_session'
  ];
  anon_allowlist text[] := ARRAY['get_invitation_by_token_secure', 'resolve_operator_checkin_by_token', 'resolve_quick_form_by_token'];
  -- RLS policies evaluate with the querying role's privileges; these predicates
  -- must stay EXECUTE-able for authenticated (but not anon).
  rls_helper_allowlist text[] := ARRAY[
    'can_user_manage_quickbooks',
    'check_org_access_secure',
    'is_org_admin',
    'is_org_member',
    'user_is_org_admin',
    'user_is_org_member'
  ];
BEGIN
  -- Strip REST-callable surface from every public SECURITY DEFINER function.
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
  END LOOP;

  -- Authenticated client / Edge user-JWT RPC surface.
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

  -- RLS predicate helpers (not intentional REST RPCs; required for policy evaluation).
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

  -- Pre-auth invitation preview (InvitationAccept page before sign-in).
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
  'EquipQR application schema. SECURITY DEFINER EXECUTE grants follow docs/ops/security-definer-rpc-policy.md (issue #762).';

COMMIT;
