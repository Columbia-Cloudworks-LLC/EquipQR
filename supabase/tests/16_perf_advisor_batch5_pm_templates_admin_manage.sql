BEGIN;
SELECT plan(5);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_templates_admin_manage'),
  0,
  'Overlapping pm_templates_admin_manage policy dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_checklist_templates_select_consolidated'),
  1,
  'SELECT policy retained'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_checklist_templates_admin_insert'),
  1,
  'INSERT policy retained'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_checklist_templates_admin_update'),
  1,
  'UPDATE policy retained'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_checklist_templates_delete_consolidated'),
  1,
  'DELETE policy retained'
);

SELECT * FROM finish();
ROLLBACK;
