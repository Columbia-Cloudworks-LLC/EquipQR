BEGIN;
SELECT plan(57);

-- ============================================================================
-- 1. Duplicate index: idx_work_orders_org_status should be gone,
--    idx_work_orders_org_status_composite should remain
-- ============================================================================

SELECT hasnt_index(
  'public', 'work_orders', 'idx_work_orders_org_status',
  'Duplicate index idx_work_orders_org_status should be dropped'
);

SELECT has_index(
  'public', 'work_orders', 'idx_work_orders_org_status_composite',
  'Retained index idx_work_orders_org_status_composite exists'
);

-- ============================================================================
-- 2. Dropped duplicate/subsumed policies should no longer exist
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'invitation_performance_logs'
     AND policyname = 'invitation_performance_logs_service_only'),
  0,
  'Duplicate policy invitation_performance_logs_service_only dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'preventative_maintenance'
     AND policyname = 'preventative_maintenance_select'),
  0,
  'Duplicate policy preventative_maintenance_select dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'organization_members'
     AND policyname = 'organization_members_select_secure'),
  0,
  'Duplicate policy organization_members_select_secure dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'equipment_notes'
     AND policyname = 'equipment_notes_delete_own'),
  0,
  'Subsumed policy equipment_notes_delete_own dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'equipment_notes'
     AND policyname = 'equipment_notes_update_own'),
  0,
  'Subsumed policy equipment_notes_update_own dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'work_order_costs'
     AND policyname = 'work_order_costs_delete'),
  0,
  'Subsumed policy work_order_costs_delete dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'work_order_costs'
     AND policyname = 'work_order_costs_select'),
  0,
  'Subsumed policy work_order_costs_select dropped'
);

-- ============================================================================
-- 3. Merged policies exist with correct new names
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'dsr_request_events'
     AND policyname = 'dsr_request_events_select'),
  1,
  'Merged policy dsr_request_events_select exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'dsr_requests'
     AND policyname = 'dsr_requests_select'),
  1,
  'Merged policy dsr_requests_select exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'export_request_log'
     AND policyname = 'export_request_log_select'),
  1,
  'Merged policy export_request_log_select exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'ownership_transfer_requests'
     AND policyname = 'ownership_transfer_requests_select'),
  1,
  'Merged policy ownership_transfer_requests_select exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'user_departure_queue'
     AND policyname = 'user_departure_queue_select'),
  1,
  'Merged policy user_departure_queue_select exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'workspace_personal_org_merge_requests'
     AND policyname = 'workspace_merge_requests_select'),
  1,
  'Merged policy workspace_merge_requests_select exists'
);

-- ============================================================================
-- 4. Old merged policy names should be gone
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'dsr_request_events'
     AND policyname = 'org_admins_manage_dsr_events'),
  0,
  'Old policy org_admins_manage_dsr_events dropped after merge'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'ownership_transfer_requests'
     AND policyname = 'service_role_manage_transfer_requests'),
  0,
  'Old ALL policy service_role_manage_transfer_requests dropped after split'
);

-- ============================================================================
-- 5. Service-role split policies exist (INSERT/UPDATE/DELETE per table)
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'ownership_transfer_requests'
     AND policyname LIKE 'ownership_transfer_requests_service_%'),
  3,
  'ownership_transfer_requests has 3 service-role write policies'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'user_departure_queue'
     AND policyname LIKE 'user_departure_queue_service_%'),
  3,
  'user_departure_queue has 3 service-role write policies'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'workspace_personal_org_merge_requests'
     AND policyname LIKE 'workspace_merge_requests_service_%'),
  3,
  'workspace_personal_org_merge_requests has 3 service-role write policies'
);

-- ============================================================================
-- 6. InitPlan-wrapped policies still exist (spot checks)
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'notifications'
     AND policyname = 'Users can view their own notifications'),
  1,
  'InitPlan-wrapped notifications policy exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
     AND policyname = 'users_manage_own_push_subscriptions'),
  1,
  'InitPlan-wrapped push_subscriptions policy exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'tickets'
     AND policyname = 'Users can view their own tickets'),
  1,
  'InitPlan-wrapped tickets policy exists'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'inventory_items'
     AND policyname = 'inventory_items_organization_isolation'),
  1,
  'InitPlan-wrapped inventory_items policy exists'
);

-- ============================================================================
-- 7. No multiple permissive SELECT on key merged tables (for authenticated)
-- ============================================================================

SELECT cmp_ok(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'dsr_requests'
     AND cmd = 'SELECT' AND permissive = 'PERMISSIVE'
     AND roles::text LIKE '%authenticated%'),
  '<=', 1,
  'dsr_requests has at most 1 permissive SELECT policy for authenticated'
);

SELECT cmp_ok(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'export_request_log'
     AND cmd = 'SELECT' AND permissive = 'PERMISSIVE'
     AND roles::text LIKE '%authenticated%'),
  '<=', 1,
  'export_request_log has at most 1 permissive SELECT for authenticated'
);

-- ============================================================================
-- 8. FK covering indexes on active tables exist
-- ============================================================================

SELECT has_index(
  'public', 'dsr_request_events', 'idx_dsr_request_events_actor_id',
  'FK index on dsr_request_events.actor_id exists'
);

SELECT has_index(
  'public', 'dsr_requests', 'idx_dsr_requests_user_id',
  'FK index on dsr_requests.user_id exists'
);

SELECT has_index(
  'public', 'teams', 'idx_teams_team_lead_id',
  'FK index on teams.team_lead_id exists'
);

SELECT has_index(
  'public', 'workspace_domains', 'idx_workspace_domains_organization_id',
  'FK index on workspace_domains.organization_id exists'
);

SELECT has_index(
  'public', 'parts_managers', 'idx_parts_managers_assigned_by',
  'FK index on parts_managers.assigned_by exists'
);

SELECT has_index(
  'public', 'user_dashboard_preferences', 'idx_user_dashboard_preferences_organization_id',
  'FK index on user_dashboard_preferences.organization_id exists'
);

SELECT has_index(
  'public', 'dsr_request_events', 'idx_dsr_request_events_request',
  'Composite FK index on dsr_request_events(dsr_request_id, created_at) retained'
);

-- ============================================================================
-- 9. Deprecated billing tables dropped
-- ============================================================================

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'billing_events'
  ),
  'Deprecated table billing_events is dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'billing_usage'
  ),
  'Deprecated table billing_usage is dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'billing_exemptions'
  ),
  'Deprecated table billing_exemptions is dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'slot_purchases'
  ),
  'Deprecated table slot_purchases is dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscribers'
  ),
  'Deprecated table subscribers is dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stripe_event_logs'
  ),
  'Deprecated table stripe_event_logs is dropped'
);

-- ============================================================================
-- 10. Resurrected part-picker tables dropped
-- ============================================================================

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'distributor_listing'
  ),
  'Resurrected table distributor_listing is dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'part_identifier'
  ),
  'Resurrected table part_identifier (old global picker) is dropped'
);

-- ============================================================================
-- 11. Non-FK unused indexes dropped
-- ============================================================================

SELECT hasnt_index(
  'public', 'dsr_requests', 'idx_dsr_requests_org_status_due',
  'Non-FK partial index idx_dsr_requests_org_status_due dropped'
);

SELECT hasnt_index(
  'public', 'dsr_requests', 'idx_dsr_requests_status',
  'Non-FK partial index idx_dsr_requests_status dropped'
);

SELECT hasnt_index(
  'public', 'dsr_requests', 'idx_dsr_requests_email',
  'Non-FK index idx_dsr_requests_email dropped'
);

SELECT hasnt_index(
  'public', 'audit_log', 'idx_audit_log_entity',
  'Non-FK composite index idx_audit_log_entity dropped'
);

SELECT hasnt_index(
  'public', 'inventory_items', 'idx_inventory_items_low_stock',
  'Non-FK partial index idx_inventory_items_low_stock dropped'
);

SELECT hasnt_index(
  'public', 'work_orders', 'idx_work_orders_created_date',
  'Non-FK index idx_work_orders_created_date dropped'
);

SELECT hasnt_index(
  'public', 'work_order_equipment', 'idx_work_order_equipment_wo',
  'Redundant index idx_work_order_equipment_wo dropped (unique covers FK)'
);

SELECT hasnt_index(
  'public', 'quickbooks_oauth_sessions', 'idx_quickbooks_oauth_sessions_token',
  'Non-FK partial index idx_quickbooks_oauth_sessions_token dropped'
);

-- ============================================================================
-- 12. Deprecated billing FK constraints removed from active tables
-- ============================================================================

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_invitations_slot_purchase_id_fkey'
  ),
  'FK organization_invitations_slot_purchase_id_fkey dropped'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_members_slot_purchase_id_fkey'
  ),
  'FK organization_members_slot_purchase_id_fkey dropped'
);

-- ============================================================================
-- 13. RLS still enabled on key tables touched by migration
-- ============================================================================

SELECT row_security_active('public.dsr_requests');

SELECT row_security_active('public.work_order_equipment');

-- ============================================================================
-- 14. Core active tables still exist (sanity check)
-- ============================================================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'work_orders'
  ),
  'Core table work_orders still exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'equipment'
  ),
  'Core table equipment still exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory_items'
  ),
  'Core table inventory_items still exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ),
  'Core table organizations still exists'
);

SELECT * FROM finish();
ROLLBACK;
