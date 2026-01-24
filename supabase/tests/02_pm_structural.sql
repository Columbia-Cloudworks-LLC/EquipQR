BEGIN;
SELECT plan(60);

-- Tables
SELECT has_table('public', 'pm_checklist_templates', 'pm_checklist_templates table exists');
SELECT has_table('public', 'preventative_maintenance', 'preventative_maintenance table exists');
SELECT has_table('public', 'pm_status_history', 'pm_status_history table exists');
SELECT has_table('public', 'pm_template_compatibility_rules', 'pm_template_compatibility_rules table exists');

-- Key columns: pm_checklist_templates
SELECT has_column('public', 'pm_checklist_templates', 'organization_id', 'pm_checklist_templates.organization_id exists');
SELECT has_column('public', 'pm_checklist_templates', 'name', 'pm_checklist_templates.name exists');
SELECT has_column('public', 'pm_checklist_templates', 'is_protected', 'pm_checklist_templates.is_protected exists');
SELECT has_column('public', 'pm_checklist_templates', 'template_data', 'pm_checklist_templates.template_data exists');
SELECT has_column('public', 'pm_checklist_templates', 'created_by', 'pm_checklist_templates.created_by exists');

SELECT col_not_null('public', 'pm_checklist_templates', 'name', 'pm_checklist_templates.name is required');
SELECT col_not_null('public', 'pm_checklist_templates', 'template_data', 'pm_checklist_templates.template_data is required');
SELECT col_not_null('public', 'pm_checklist_templates', 'created_by', 'pm_checklist_templates.created_by is required');

SELECT col_type_is('public', 'pm_checklist_templates', 'template_data', 'jsonb', 'pm_checklist_templates.template_data is jsonb');
SELECT col_type_is('public', 'pm_checklist_templates', 'is_protected', 'boolean', 'pm_checklist_templates.is_protected is boolean');

-- Key columns: preventative_maintenance
SELECT has_column('public', 'preventative_maintenance', 'organization_id', 'preventative_maintenance.organization_id exists');
SELECT has_column('public', 'preventative_maintenance', 'work_order_id', 'preventative_maintenance.work_order_id exists');
SELECT has_column('public', 'preventative_maintenance', 'equipment_id', 'preventative_maintenance.equipment_id exists');
SELECT has_column('public', 'preventative_maintenance', 'status', 'preventative_maintenance.status exists');
SELECT has_column('public', 'preventative_maintenance', 'checklist_data', 'preventative_maintenance.checklist_data exists');
SELECT has_column('public', 'preventative_maintenance', 'template_id', 'preventative_maintenance.template_id exists');
SELECT has_column('public', 'preventative_maintenance', 'is_historical', 'preventative_maintenance.is_historical exists');

SELECT col_not_null('public', 'preventative_maintenance', 'organization_id', 'preventative_maintenance.organization_id is required');
SELECT col_not_null('public', 'preventative_maintenance', 'work_order_id', 'preventative_maintenance.work_order_id is required');
SELECT col_not_null('public', 'preventative_maintenance', 'equipment_id', 'preventative_maintenance.equipment_id is required');
SELECT col_not_null('public', 'preventative_maintenance', 'status', 'preventative_maintenance.status is required');
SELECT col_not_null('public', 'preventative_maintenance', 'checklist_data', 'preventative_maintenance.checklist_data is required');

SELECT col_type_is('public', 'preventative_maintenance', 'checklist_data', 'jsonb', 'preventative_maintenance.checklist_data is jsonb');
SELECT col_type_is('public', 'preventative_maintenance', 'status', 'text', 'preventative_maintenance.status is text');
SELECT col_type_is('public', 'preventative_maintenance', 'is_historical', 'boolean', 'preventative_maintenance.is_historical is boolean');

-- Key columns: pm_status_history
SELECT has_column('public', 'pm_status_history', 'pm_id', 'pm_status_history.pm_id exists');
SELECT has_column('public', 'pm_status_history', 'new_status', 'pm_status_history.new_status exists');
SELECT has_column('public', 'pm_status_history', 'changed_by', 'pm_status_history.changed_by exists');

-- Foreign keys
SELECT fk_ok('public', 'pm_status_history', 'pm_id', 'public', 'preventative_maintenance', 'id', 'pm_status_history.pm_id FK');
SELECT fk_ok('public', 'preventative_maintenance', 'work_order_id', 'public', 'work_orders', 'id', 'preventative_maintenance.work_order_id FK');
SELECT fk_ok('public', 'preventative_maintenance', 'equipment_id', 'public', 'equipment', 'id', 'preventative_maintenance.equipment_id FK');
SELECT fk_ok('public', 'preventative_maintenance', 'organization_id', 'public', 'organizations', 'id', 'preventative_maintenance.organization_id FK');
SELECT fk_ok('public', 'preventative_maintenance', 'template_id', 'public', 'pm_checklist_templates', 'id', 'preventative_maintenance.template_id FK');
SELECT fk_ok('public', 'pm_checklist_templates', 'organization_id', 'public', 'organizations', 'id', 'pm_checklist_templates.organization_id FK');
SELECT fk_ok('public', 'pm_checklist_templates', 'created_by', 'public', 'profiles', 'id', 'pm_checklist_templates.created_by FK');

-- RLS enabled
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pm_checklist_templates'::regclass), 'RLS enabled on pm_checklist_templates');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.preventative_maintenance'::regclass), 'RLS enabled on preventative_maintenance');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pm_status_history'::regclass), 'RLS enabled on pm_status_history');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pm_template_compatibility_rules'::regclass), 'RLS enabled on pm_template_compatibility_rules');

-- Policies
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates' AND policyname = 'pm_checklist_templates_admin_insert'), 1, 'pm_checklist_templates_admin_insert policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates' AND policyname = 'pm_checklist_templates_admin_update'), 1, 'pm_checklist_templates_admin_update policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates' AND policyname = 'pm_checklist_templates_delete_consolidated'), 1, 'pm_checklist_templates_delete_consolidated policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates' AND policyname = 'pm_checklist_templates_select_consolidated'), 1, 'pm_checklist_templates_select_consolidated policy exists');

SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_status_history' AND policyname = 'pm_status_history_admin_insert'), 1, 'pm_status_history_admin_insert policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_status_history' AND policyname = 'pm_status_history_select_consolidated'), 1, 'pm_status_history_select_consolidated policy exists');

SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'preventative_maintenance' AND policyname = 'preventative_maintenance_insert_consolidated'), 1, 'preventative_maintenance_insert_consolidated policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'preventative_maintenance' AND policyname = 'preventative_maintenance_select_consolidated'), 1, 'preventative_maintenance_select_consolidated policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'preventative_maintenance' AND policyname = 'preventative_maintenance_update_consolidated'), 1, 'preventative_maintenance_update_consolidated policy exists');

SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_template_compatibility_rules' AND policyname = 'pm_template_compat_rules_insert'), 1, 'pm_template_compat_rules_insert policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_template_compatibility_rules' AND policyname = 'pm_template_compat_rules_select'), 1, 'pm_template_compat_rules_select policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_template_compatibility_rules' AND policyname = 'pm_template_compat_rules_update'), 1, 'pm_template_compat_rules_update policy exists');
SELECT is((SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_template_compatibility_rules' AND policyname = 'pm_template_compat_rules_delete'), 1, 'pm_template_compat_rules_delete policy exists');

-- Triggers
SELECT has_trigger('public', 'preventative_maintenance', 'audit_pm_trigger', 'audit_pm_trigger exists');
SELECT has_trigger('public', 'preventative_maintenance', 'pm_status_change_trigger', 'pm_status_change_trigger exists');
SELECT has_trigger('public', 'pm_checklist_templates', 'trg_pm_checklist_templates_touch', 'trg_pm_checklist_templates_touch exists');
SELECT has_trigger('public', 'preventative_maintenance', 'trigger_update_pm_updated_at', 'trigger_update_pm_updated_at exists');

SELECT * FROM finish();
ROLLBACK;
