-- Qodo PR feedback: reclaim stale invoice-status events stuck in processing;
-- narrow claim RPC payload (omit raw_event); harden SECURITY DEFINER cron
-- invoker with session_user; fail-closed GRANT hygiene.
--
-- Note: Postgres cannot change function return type with CREATE OR REPLACE; drop first.

BEGIN;

DROP FUNCTION IF EXISTS public.claim_quickbooks_invoice_status_events(integer);

CREATE FUNCTION public.claim_quickbooks_invoice_status_events(p_batch_size integer)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  realm_id text,
  entity_name text,
  entity_id text,
  operation text,
  attempts integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH picked AS (
    SELECT e.id
    FROM public.quickbooks_invoice_status_events e
    WHERE e.attempts < 5
      AND (
        e.status IN ('pending', 'error')
        OR (
          e.status = 'processing'
          AND e.updated_at < now() - interval '15 minutes'
        )
      )
    ORDER BY e.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_batch_size, 0), 1), 500)
  )
  UPDATE public.quickbooks_invoice_status_events u
  SET
    status = 'processing',
    attempts = u.attempts + 1,
    last_error = NULL
  FROM picked p
  WHERE u.id = p.id
  RETURNING
    u.id,
    u.organization_id,
    u.realm_id,
    u.entity_name,
    u.entity_id,
    u.operation,
    u.attempts;
$$;

COMMENT ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) IS
  'Locks and returns slim columns for up to p_batch_size eligible invoice status events '
  '(pending/error, plus processing rows stale >15m for crash recovery), marking processing '
  'and bumping attempts. Callable only by service_role.';

REVOKE ALL ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_qbo_invoice_status_events_stale_processing
  ON public.quickbooks_invoice_status_events(updated_at)
  WHERE status = 'processing'
    AND attempts < 5;

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_invoice_status_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  -- SECURITY DEFINER resets current_user to the function owner; session_user preserves
  -- the real session identity (caller), which pg_cron uses as postgres.
  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
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
  'SECURITY DEFINER: invokes quickbooks-sync-invoice-status from pg_cron only (session_user=postgres + cron.job_id). '
  'Uses vault.decrypted_secrets and net.http_post. Not executable by JWT roles or service_role API.';

COMMIT;
