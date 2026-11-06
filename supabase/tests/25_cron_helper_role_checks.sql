-- pgTAP: Cron helper role checks must not cast current_user to oid (issue #1141)
-- SECURITY DEFINER cron helpers must authorize via session_user. They must not
-- require cron.job_id: pg_cron never sets that GUC, so such a guard rejects
-- every scheduled run (fixed in 20261105041839).

BEGIN;
SELECT plan(12);

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

SELECT ok(
  position('_invoke_quickbooks_token_refresh_internal' IN pg_get_functiondef(p.oid)) > 0,
  'invoke_quickbooks_token_refresh must delegate to internal helper'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_quickbooks_token_refresh'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT ok(
  position('_invoke_quickbooks_token_refresh_internal' IN pg_get_functiondef(p.oid)) > 0,
  'refresh_quickbooks_tokens_manual must call internal helper, not cron wrapper'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'refresh_quickbooks_tokens_manual'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT is(
  position('cron.job_id' IN pg_get_functiondef(p.oid)),
  0,
  'invoke_queue_worker must not require cron.job_id (never set by pg_cron)'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_queue_worker'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT is(
  position('cron.job_id' IN pg_get_functiondef(p.oid)),
  0,
  'refresh_stripe_materialized_views must not require cron.job_id (never set by pg_cron)'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'refresh_stripe_materialized_views'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT is(
  position('cron.job_id' IN pg_get_functiondef(p.oid)),
  0,
  'invoke_quickbooks_token_refresh must not require cron.job_id (never set by pg_cron)'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_quickbooks_token_refresh'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT is(
  position('cron.job_id' IN pg_get_functiondef(p.oid)),
  0,
  'invoke_quickbooks_invoice_status_sync must not require cron.job_id (never set by pg_cron)'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'invoke_quickbooks_invoice_status_sync'
  AND pg_get_function_identity_arguments(p.oid) = '';

SELECT finish();
ROLLBACK;
