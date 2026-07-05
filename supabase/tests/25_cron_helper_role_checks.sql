-- pgTAP: Cron helper role checks must not cast current_user to oid (issue #1141)
-- SECURITY DEFINER cron helpers must authorize via session_user + cron.job_id,
-- matching public.invoke_quickbooks_invoice_status_sync().

BEGIN;
SELECT plan(6);

SELECT is(
  position('current_user::oid' IN pg_get_functiondef(p.oid)),
  0,
  'invoke_queue_worker must not cast current_user to oid'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_queue_worker'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT is(
  position('current_user::oid' IN pg_get_functiondef(p.oid)),
  0,
  'refresh_stripe_materialized_views must not cast current_user to oid'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'refresh_stripe_materialized_views'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT is(
  position('current_user::oid' IN pg_get_functiondef(p.oid)),
  0,
  'invoke_quickbooks_token_refresh must not cast current_user to oid'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_quickbooks_token_refresh'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT ok(
  position('session_user' IN pg_get_functiondef(p.oid)) > 0,
  'invoke_queue_worker must authorize via session_user'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_queue_worker'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT ok(
  position('session_user' IN pg_get_functiondef(p.oid)) > 0,
  'refresh_stripe_materialized_views must authorize via session_user'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'refresh_stripe_materialized_views'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT ok(
  position('session_user' IN pg_get_functiondef(p.oid)) > 0,
  'invoke_quickbooks_token_refresh must authorize via session_user'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_quickbooks_token_refresh'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT finish();
ROLLBACK;
