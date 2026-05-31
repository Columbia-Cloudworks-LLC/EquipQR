-- Harden invoke_quickbooks_invoice_status_sync SECURITY DEFINER search_path.
-- Empty search_path forces explicit schema qualification and matches project
-- convention for privileged functions. Caller identity remains session_user
-- (not current_user) under SECURITY DEFINER. Grants stay fail-closed for API roles.

BEGIN;

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
  'SECURITY DEFINER with SET search_path to empty string. Invokes quickbooks-sync-invoice-status from pg_cron only '
  '(session_user=postgres and cron.job_id set). Uses vault.decrypted_secrets and net.http_post. '
  'Not executable by JWT roles or service_role API.';

COMMIT;
