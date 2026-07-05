-- =============================================================================
-- Migration: Fix cron helper role checks (issue #1141)
-- Date: 2026-07-05
--
-- Replaces invalid `WHERE oid = current_user::oid` lookups in SECURITY DEFINER
-- cron helpers. current_user is a role name (text), not an OID, which caused
-- recurring Postgres errors:
--   invalid input syntax for type oid: "postgres"
--
-- Aligns authorization with public.invoke_quickbooks_invoice_status_sync():
-- session_user preserves the pg_cron caller identity; cron.job_id proves the
-- pg_cron scheduler context.
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
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  -- SECURITY DEFINER resets current_user to the function owner; session_user
  -- preserves the real session identity (caller), which pg_cron uses as postgres.
  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
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

CREATE OR REPLACE FUNCTION public.refresh_stripe_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
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

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by the pg_cron scheduler as postgres';
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
    RAISE WARNING 'QuickBooks token refresh skipped: vault secrets not configured';
    RETURN;
  END IF;

  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'QuickBooks token refresh skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/quickbooks-refresh-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule QuickBooks token refresh invocation';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM authenticated;

COMMIT;
