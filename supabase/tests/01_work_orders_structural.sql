BEGIN;
SELECT plan(45);

-- Tables
SELECT has_table('public', 'work_orders', 'work_orders table exists');
SELECT has_table('public', 'work_order_equipment', 'work_order_equipment table exists');
SELECT has_table('public', 'work_order_notes', 'work_order_notes table exists');
SELECT has_table('public', 'work_order_images', 'work_order_images table exists');
SELECT has_table('public', 'work_order_status_history', 'work_order_status_history table exists');

-- Key columns
SELECT has_column('public', 'work_orders', 'organization_id', 'work_orders.organization_id exists');
SELECT has_column('public', 'work_orders', 'equipment_id', 'work_orders.equipment_id exists');
SELECT has_column('public', 'work_orders', 'created_by', 'work_orders.created_by exists');
SELECT has_column('public', 'work_orders', 'status', 'work_orders.status exists');
SELECT has_column('public', 'work_orders', 'priority', 'work_orders.priority exists');
SELECT has_column('public', 'work_orders', 'is_historical', 'work_orders.is_historical exists');
SELECT has_column('public', 'work_orders', 'created_by_admin', 'work_orders.created_by_admin exists');

SELECT col_not_null('public', 'work_orders', 'organization_id', 'work_orders.organization_id is required');
SELECT col_not_null('public', 'work_orders', 'equipment_id', 'work_orders.equipment_id is required');
SELECT col_not_null('public', 'work_orders', 'title', 'work_orders.title is required');
SELECT col_not_null('public', 'work_orders', 'description', 'work_orders.description is required');
SELECT col_not_null('public', 'work_orders', 'created_by', 'work_orders.created_by is required');
SELECT col_not_null('public', 'work_orders', 'status', 'work_orders.status is required');
SELECT col_not_null('public', 'work_orders', 'priority', 'work_orders.priority is required');

SELECT col_type_is('public', 'work_orders', 'status', 'work_order_status', 'work_orders.status type is work_order_status');
SELECT col_type_is('public', 'work_orders', 'priority', 'work_order_priority', 'work_orders.priority type is work_order_priority');
SELECT col_type_is('public', 'work_orders', 'has_pm', 'boolean', 'work_orders.has_pm type is boolean');
SELECT col_type_is('public', 'work_orders', 'pm_required', 'boolean', 'work_orders.pm_required type is boolean');

-- Foreign keys
SELECT fk_ok('public', 'work_orders', 'organization_id', 'public', 'organizations', 'id', 'work_orders.organization_id FK');
SELECT fk_ok('public', 'work_orders', 'equipment_id', 'public', 'equipment', 'id', 'work_orders.equipment_id FK');
SELECT fk_ok('public', 'work_orders', 'created_by', 'public', 'profiles', 'id', 'work_orders.created_by FK');
SELECT fk_ok('public', 'work_orders', 'created_by_admin', 'auth', 'users', 'id', 'work_orders.created_by_admin FK');
SELECT fk_ok('public', 'work_orders', 'assignee_id', 'public', 'profiles', 'id', 'work_orders.assignee_id FK');

-- RLS enabled
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.work_orders'::regclass), 'RLS enabled on work_orders');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.work_order_equipment'::regclass), 'RLS enabled on work_order_equipment');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.work_order_notes'::regclass), 'RLS enabled on work_order_notes');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.work_order_images'::regclass), 'RLS enabled on work_order_images');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.work_order_status_history'::regclass), 'RLS enabled on work_order_status_history');

-- Policies
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_orders' AND policyname = 'work_orders_insert_consolidated'), 1, 'work_orders_insert_consolidated policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_orders' AND policyname = 'work_orders_select_consolidated'), 1, 'work_orders_select_consolidated policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_orders' AND policyname = 'work_orders_update_consolidated'), 1, 'work_orders_update_consolidated policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_orders' AND policyname = 'Admins can delete work orders'), 1, 'Admins can delete work orders policy exists');

SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_order_equipment' AND policyname = 'work_order_equipment_select_policy'), 1, 'work_order_equipment_select_policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_order_equipment' AND policyname = 'work_order_equipment_insert_policy'), 1, 'work_order_equipment_insert_policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_order_equipment' AND policyname = 'work_order_equipment_update_policy'), 1, 'work_order_equipment_update_policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_order_equipment' AND policyname = 'work_order_equipment_delete_policy'), 1, 'work_order_equipment_delete_policy exists');

-- Triggers
SELECT has_trigger('public', 'work_orders', 'audit_work_order_trigger', 'audit_work_order_trigger exists');
SELECT has_trigger('public', 'work_orders', 'work_order_status_change_trigger', 'work_order_status_change_trigger exists');
SELECT has_trigger('public', 'work_orders', 'trg_validate_work_order_assignee', 'trg_validate_work_order_assignee exists');
SELECT has_trigger('public', 'work_order_equipment', 'trigger_sync_primary_equipment', 'trigger_sync_primary_equipment exists');

SELECT * FROM finish();
ROLLBACK;
