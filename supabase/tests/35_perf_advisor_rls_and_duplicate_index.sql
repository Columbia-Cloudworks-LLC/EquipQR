BEGIN;
SELECT plan(13);

-- ============================================================================
-- 1. pm_interval_policies: auth.uid() is wrapped in a scalar subquery
--    (Supabase lint 0003_auth_rls_initplan)
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_interval_policies'),
  4,
  'pm_interval_policies still has four RLS policies'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_interval_policies'
     AND replace(
           coalesce(qual, '') || ' ' || coalesce(with_check, ''),
           '( SELECT auth.uid() AS uid)', ''
         ) ~ 'auth\.uid\(\)'),
  0,
  'pm_interval_policies policies never call auth.uid() per row'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_interval_policies'
     AND (coalesce(qual, '') || ' ' || coalesce(with_check, ''))
         LIKE '%( SELECT auth.uid() AS uid)%'),
  4,
  'all four pm_interval_policies policies use (select auth.uid())'
);

-- ============================================================================
-- 2. equipment: exactly one permissive policy per action
--    (Supabase lint 0006_multiple_permissive_policies)
-- ============================================================================

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'equipment' AND cmd = 'ALL'),
  0,
  'equipment has no FOR ALL policy overlapping the per-action policies'
);

SELECT is(
  (SELECT count(*)::int FROM (
     SELECT cmd FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'equipment'
       AND permissive = 'PERMISSIVE'
     GROUP BY cmd HAVING count(*) > 1
   ) dup),
  0,
  'equipment has at most one permissive policy per action'
);

SELECT is(
  (SELECT array_agg(policyname::text || ':' || cmd ORDER BY policyname)
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'equipment'),
  ARRAY[
    'equipment_delete:DELETE',
    'equipment_insert:INSERT',
    'equipment_select:SELECT',
    'equipment_update:UPDATE'
  ],
  'equipment has exactly the four consolidated per-action policies'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'equipment'
     AND replace(
           coalesce(qual, '') || ' ' || coalesce(with_check, ''),
           '( SELECT auth.uid() AS uid)', ''
         ) ~ 'auth\.uid\(\)'),
  0,
  'equipment policies never call auth.uid() per row'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.equipment'::regclass),
  'RLS is still enabled on equipment'
);

-- ============================================================================
-- 3. operator_checklist_templates: duplicate unique index removed
--    (Supabase lint 0009_duplicate_index)
-- ============================================================================

SELECT hasnt_index(
  'public', 'operator_checklist_templates',
  'operator_checklist_templates_id_organization_id_key',
  'Duplicate unique constraint index is dropped'
);

SELECT has_index(
  'public', 'operator_checklist_templates',
  'idx_operator_checklist_templates_id_org',
  'Retained unique index idx_operator_checklist_templates_id_org exists'
);

SELECT ok(
  (SELECT indisunique FROM pg_index
   WHERE indexrelid = 'public.idx_operator_checklist_templates_id_org'::regclass),
  'Retained index still enforces uniqueness of (id, organization_id)'
);

SELECT is(
  (SELECT conindid::regclass::text FROM pg_constraint
   WHERE conname = 'equipment_operator_checkin_settings_template_org_fkey'),
  'idx_operator_checklist_templates_id_org',
  'equipment_operator_checkin_settings composite FK still backed by the retained index'
);

SELECT is(
  (SELECT conindid::regclass::text FROM pg_constraint
   WHERE conname = 'operator_checkin_submissions_template_organization_fkey'),
  'idx_operator_checklist_templates_id_org',
  'operator_checkin_submissions composite FK still backed by the retained index'
);

SELECT * FROM finish();
ROLLBACK;
