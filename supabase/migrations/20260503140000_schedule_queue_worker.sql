-- =============================================================================
-- Migration: Schedule the notifications queue drainer
-- Issue: #722 (Sub-change 2 of 3)
-- Date: 2026-05-03
--
-- Defines public.invoke_queue_worker() and schedules a pg_cron job that calls
-- it every minute. The function performs net.http_post to the queue-worker
-- Edge Function with a Bearer token sourced from Supabase Vault
-- (service_role_key + supabase_url, the same vault entries that
-- 20251221120000_schedule_quickbooks_refresh.sql relies on).
--
-- Security posture (modeled exactly on the QuickBooks refresh job):
--   * SECURITY DEFINER + SET search_path = public to control extension/schema
--     resolution
--   * Authorization check: only postgres superuser AND only when running
--     inside a pg_cron job (cron.job_id is set)
--   * URL-validation regex against the vault-stored supabase_url to defend
--     against SSRF / vault tampering
--   * REVOKE EXECUTE FROM PUBLIC so application code cannot call the function
--   * Idempotent cron.unschedule guard so the migration is safe to replay
--
-- See Change Record on issue #722 for the full design.
-- =============================================================================

BEGIN;

-- ============================================================================
-- PART 1: SECURITY DEFINER function that invokes the queue-worker Edge Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.invoke_queue_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  current_user_role text;
  cron_job_id text;
BEGIN
  -- Authorization: only allow execution from the pg_cron scheduler, which
  -- runs jobs as the postgres superuser and sets cron.job_id.
  SELECT rolname
  INTO current_user_role
  FROM pg_roles
  WHERE oid = current_user::oid;

  cron_job_id := current_setting('cron.job_id', true);

  IF current_user_role != 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: invoke_queue_worker can only be called by the pg_cron scheduler as postgres';
  END IF;

  -- Pull credentials from Supabase Vault (same secrets as the QuickBooks
  -- refresh flow already uses).
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

  -- Defense-in-depth URL validation against vault tampering.
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

COMMENT ON FUNCTION public.invoke_queue_worker() IS
  'Invokes the queue-worker Edge Function to drain the notifications pgmq queue. '
  'Called by the drain-notifications-queue pg_cron job. Secured to postgres '
  'superuser running under pg_cron only; uses vault-stored service_role_key '
  'and supabase_url with URL-validation regex defense.';

-- ============================================================================
-- PART 2: Schedule the cron job (every minute)
-- ============================================================================
DO $$
BEGIN
  -- Idempotent: drop the job if it already exists from a prior replay.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-notifications-queue') THEN
    PERFORM cron.unschedule('drain-notifications-queue');
  END IF;
END;
$$;

SELECT cron.schedule(
  'drain-notifications-queue',
  '* * * * *',
  $$SELECT public.invoke_queue_worker();$$
);

COMMIT;
