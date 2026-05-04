-- =============================================================================
-- Migration: Schedule Stripe materialized view refresh
-- Issue: #722 (Sub-change 3 of 3)
-- Date: 2026-05-03
--
-- Defines public.refresh_stripe_materialized_views() and schedules a pg_cron
-- job that calls it every 15 minutes. The function performs
-- REFRESH MATERIALIZED VIEW CONCURRENTLY on the Stripe-backed materialized
-- views in the public schema (currently just org_active_stripe_subscriptions).
--
-- Cost analysis: ~8 Stripe API calls per refresh (paged subscription/customer
-- queries) × 96 refreshes/day = ~768 API calls/day, comfortably below
-- Stripe's per-account rate limit. The MV's UNIQUE INDEX on subscription_id
-- (created in 20260503160000) supports CONCURRENTLY so reads are not blocked
-- during refresh.
--
-- Security posture (modeled on invoke_quickbooks_token_refresh +
-- invoke_queue_worker):
--   * SECURITY DEFINER + SET search_path = public to control resolution
--   * Authorization check: only postgres superuser AND only when running
--     inside a pg_cron job (cron.job_id is set)
--   * REVOKE EXECUTE FROM PUBLIC so application code cannot call the function
--   * Idempotent: gracefully skips when the MV does not exist (matches the
--     conditional Section B setup pattern in 20260503160000)
--   * Idempotent cron.unschedule guard so the migration is safe to replay
--
-- See Change Record on issue #722 for the full design.
-- =============================================================================

BEGIN;

-- ============================================================================
-- PART 1: SECURITY DEFINER refresh function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_stripe_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
  cron_job_id text;
BEGIN
  -- Authorization: only allow execution from the pg_cron scheduler.
  SELECT rolname
  INTO current_user_role
  FROM pg_roles
  WHERE oid = current_user::oid;

  cron_job_id := current_setting('cron.job_id', true);

  IF current_user_role != 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: refresh_stripe_materialized_views can only be called by the pg_cron scheduler as postgres';
  END IF;

  -- Refresh org_active_stripe_subscriptions if it exists. The MV is created
  -- conditionally in 20260503160000 (only when the Vault secret is present),
  -- so we must guard against its absence to keep this function safe to run
  -- even before External Setup Procedures Section B is complete.
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'org_active_stripe_subscriptions'
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

COMMENT ON FUNCTION public.refresh_stripe_materialized_views() IS
  'Refreshes Stripe-backed materialized views in the public schema using '
  'REFRESH MATERIALIZED VIEW CONCURRENTLY. Currently refreshes '
  'org_active_stripe_subscriptions only. Called by the refresh-stripe-mvs '
  'pg_cron job every 15 minutes. Secured to postgres superuser running under '
  'pg_cron only. Skips gracefully when the MV does not exist (pre-Section-B '
  'state). See migration 20260503170000 and Change Record on issue #722.';

-- ============================================================================
-- PART 2: Schedule the cron job (every 15 minutes)
-- ============================================================================
DO $$
BEGIN
  -- Idempotent: drop if the job already exists from a prior replay.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-stripe-mvs') THEN
    PERFORM cron.unschedule('refresh-stripe-mvs');
  END IF;
END;
$$;

SELECT cron.schedule(
  'refresh-stripe-mvs',
  '*/15 * * * *',
  $$SELECT public.refresh_stripe_materialized_views();$$
);

COMMIT;
