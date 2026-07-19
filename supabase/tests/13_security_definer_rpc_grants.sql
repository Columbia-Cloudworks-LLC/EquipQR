-- pgTAP: SECURITY DEFINER EXECUTE grant lockdown (issues #762, #1310)
-- Allowlist names must match scripts/security-definer-rpc-allowlists.json
-- (validated by scripts/validate-security-definer-allowlist-sync.mjs).

BEGIN;
SELECT plan(17);

-- 1. Only intentional pre-auth / token RPCs remain callable by anon.
SELECT is(
  (SELECT count(*)::integer
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  3,
  'exactly three public SECURITY DEFINER functions are executable by anon'
);

SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.get_invitation_by_token_secure(uuid)',
            'EXECUTE')),
  true,
  'anon may execute get_invitation_by_token_secure'
);

SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.resolve_operator_checkin_by_token(text)',
            'EXECUTE')),
  true,
  'anon may execute resolve_operator_checkin_by_token'
);

SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.resolve_quick_form_by_token(text)',
            'EXECUTE')),
  true,
  'anon may execute resolve_quick_form_by_token'
);

-- 2. Representative internal helpers are not REST-callable.
SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.audit_equipment_changes()',
            'EXECUTE')),
  false,
  'anon cannot execute audit_equipment_changes trigger helper'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.audit_equipment_changes()',
            'EXECUTE')),
  false,
  'authenticated cannot execute audit_equipment_changes trigger helper'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.preview_account_deletion(uuid)',
            'EXECUTE')),
  false,
  'authenticated cannot execute preview_account_deletion'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.is_user_google_oauth_verified(uuid)',
            'EXECUTE')),
  false,
  'authenticated cannot execute is_user_google_oauth_verified'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.invoke_queue_worker()',
            'EXECUTE')),
  false,
  'authenticated cannot execute invoke_queue_worker'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.is_valid_work_order_assignee(uuid, uuid, uuid)',
            'EXECUTE')),
  false,
  'authenticated cannot execute is_valid_work_order_assignee'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.submit_operator_checkin_public(text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text)',
            'EXECUTE')),
  false,
  'authenticated cannot execute submit_operator_checkin_public (edge service_role only)'
);

SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.submit_operator_checkin_public(text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text)',
            'EXECUTE')),
  false,
  'anon cannot execute submit_operator_checkin_public (edge service_role only)'
);

-- 3. Dashboard RPC is authenticated-only.
SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.get_dashboard_trends(uuid, integer, uuid, boolean)',
            'EXECUTE')),
  false,
  'anon cannot execute get_dashboard_trends'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.get_dashboard_trends(uuid, integer, uuid, boolean)',
            'EXECUTE')),
  true,
  'authenticated can execute get_dashboard_trends'
);

-- 4. Every authenticated-executable public SECURITY DEFINER is allowlisted.
SELECT is(
  (SELECT count(*)::integer
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND p.proname NOT IN (
        SELECT unnest(ARRAY[
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
          'can_user_manage_quickbooks',
          'cancel_ownership_transfer',
          'check_admin_permission_safe',
          'check_org_access_secure',
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
          'is_org_admin',
          'is_org_member',
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
          'user_is_org_admin',
          'user_is_org_member',
          'validate_quickbooks_oauth_session'
        ])
      )),
  0,
  'no unexpected authenticated EXECUTE on public SECURITY DEFINER functions'
);

-- 5. RBAC helper: anon blocked, authenticated allowed for policy evaluation.
SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.is_org_member(uuid, uuid)',
            'EXECUTE')),
  false,
  'anon cannot execute is_org_member helper'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.is_org_member(uuid, uuid)',
            'EXECUTE')),
  true,
  'authenticated may execute is_org_member for RLS policies'
);

SELECT * FROM finish();
ROLLBACK;
