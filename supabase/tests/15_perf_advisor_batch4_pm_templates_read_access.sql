BEGIN;
SELECT plan(3);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_templates_read_access'),
  0,
  'Redundant pm_templates_read_access policy dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_checklist_templates_select_consolidated'),
  1,
  'pm_checklist_templates_select_consolidated policy retained'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_templates_admin_manage'),
  1,
  'pm_templates_admin_manage policy retained'
);

SELECT * FROM finish();
ROLLBACK;
