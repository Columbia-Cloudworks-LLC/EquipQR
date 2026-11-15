BEGIN;
SELECT plan(1);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_checklist_templates'
     AND policyname = 'pm_templates_read_access'),
  0,
  'Redundant pm_templates_read_access policy dropped'
);

-- pm_templates_admin_manage was later dropped on purpose by batch 5
-- (20260602160603); 16_perf_advisor_batch5_pm_templates_admin_manage covers it.

SELECT * FROM finish();
ROLLBACK;
