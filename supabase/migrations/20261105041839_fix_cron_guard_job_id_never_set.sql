-- =============================================================================
-- Migration: Fix pg_cron helper guards that rejected every scheduled run
--
-- 20260705130000 / 20260518134650 required current_setting('cron.job_id') to be
-- set. pg_cron (1.6.x) never sets that GUC, so every guarded job failed with
-- "Access denied: ... can only be called by the pg_cron scheduler as postgres"
-- (verified: a pg_cron job sees session_user=postgres, cron.job_id=NULL).
-- Affected jobs: drain-notifications-queue, refresh-quickbooks-tokens,
-- refresh-stripe-mvs, quickbooks-invoice-status-sync.
--
-- Authorization is now session_user = 'postgres' only. EXECUTE stays revoked
-- from PUBLIC, anon, authenticated and service_role, so API roles still
-- cannot call these helpers.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.invoke_queue_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
BEGIN
  -- session_user keeps the caller identity under SECURITY DEFINER; pg_cron
  -- runs these jobs as postgres. EXECUTE is revoked from all API roles.
  IF session_user::text <> 'postgres' THEN
    RAISE EXCEPTION 'Access denied: invoke_queue_worker can only be called by the pg_cron scheduler as postgres';
  END IF;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'Queue worker invocation skipped: vault secrets not configured';
    RETURN;
  END IF;

  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'Queue worker invocation skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/queue-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule queue worker invocation';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_queue_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_queue_worker() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoke_queue_worker() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_queue_worker() FROM service_role;

CREATE OR REPLACE FUNCTION public.refresh_stripe_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
BEGIN
  -- session_user keeps the caller identity under SECURITY DEFINER; pg_cron
  -- runs these jobs as postgres. EXECUTE is revoked from all API roles.
  IF session_user::text <> 'postgres' THEN
    RAISE EXCEPTION 'Access denied: refresh_stripe_materialized_views can only be called by the pg_cron scheduler as postgres';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'org_active_stripe_subscriptions'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.org_active_stripe_subscriptions;
  ELSE
    RAISE NOTICE 'Stripe materialized view refresh skipped: org_active_stripe_subscriptions does not exist yet. '
                 'Complete External Setup Procedures Section B (Change Record on issue #722) and re-apply '
                 'migration 20260503160000 to provision the MV.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_stripe_materialized_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_stripe_materialized_views() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_stripe_materialized_views() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_stripe_materialized_views() FROM service_role;

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
BEGIN
  -- session_user keeps the caller identity under SECURITY DEFINER; pg_cron
  -- runs these jobs as postgres. EXECUTE is revoked from all API roles.
  IF session_user::text <> 'postgres' THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by the pg_cron scheduler as postgres';
  END IF;

  PERFORM public._invoke_quickbooks_token_refresh_internal();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM service_role;

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_invoice_status_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
BEGIN
  -- session_user keeps the caller identity under SECURITY DEFINER; pg_cron
  -- runs these jobs as postgres. EXECUTE is revoked from all API roles.
  IF session_user::text <> 'postgres' THEN
    RAISE EXCEPTION 'Access denied: invoke_quickbooks_invoice_status_sync can only be called by the pg_cron scheduler as postgres';
  END IF;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'QuickBooks invoice status sync skipped: vault secrets not configured';
    RETURN;
  END IF;

  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'QuickBooks invoice status sync skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/quickbooks-sync-invoice-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule QuickBooks invoice status sync invocation';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_invoice_status_sync() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_invoice_status_sync() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_invoice_status_sync() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_invoice_status_sync() FROM service_role;

COMMENT ON FUNCTION public.invoke_quickbooks_invoice_status_sync() IS
  'SECURITY DEFINER with SET search_path to empty string. Invokes quickbooks-sync-invoice-status from pg_cron only '
  '(session_user=postgres). Uses vault.decrypted_secrets and net.http_post. '
  'Not executable by JWT roles or service_role API.';

COMMIT;
