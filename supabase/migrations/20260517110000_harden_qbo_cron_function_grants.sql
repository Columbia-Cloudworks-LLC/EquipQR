-- Harden execute permissions on the QuickBooks invoice status cron function.
-- The original migration (20260517100000) only revokes from PUBLIC, but Supabase's
-- default privileges also grant execution to the anon and authenticated roles.
-- Revoke from those roles explicitly so only pg_cron (running as postgres) can
-- invoke the function.

REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_invoice_status_sync() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_invoice_status_sync() FROM authenticated;

COMMIT;
