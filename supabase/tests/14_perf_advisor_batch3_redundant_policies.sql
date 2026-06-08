BEGIN;
SELECT plan(4);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_status_history'
     AND policyname = 'pm_status_history_member_select'),
  0,
  'Duplicate pm_status_history_member_select policy dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'pm_status_history'
     AND policyname = 'pm_status_history_select_consolidated'),
  1,
  'pm_status_history_select_consolidated policy retained'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'invitation_performance_logs'
     AND policyname = 'no_user_access_performance_logs'),
  0,
  'Redundant no_user_access_performance_logs policy dropped'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'invitation_performance_logs'
     AND policyname = 'service_role_only_performance_logs'),
  1,
  'service_role_only_performance_logs policy retained'
);

SELECT * FROM finish();
ROLLBACK;
