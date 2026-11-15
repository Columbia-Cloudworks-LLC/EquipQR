BEGIN;
SELECT plan(1);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_templates_admin_manage'),
  0,
  'Overlapping pm_templates_admin_manage policy dropped'
);

SELECT * FROM finish();
ROLLBACK;
