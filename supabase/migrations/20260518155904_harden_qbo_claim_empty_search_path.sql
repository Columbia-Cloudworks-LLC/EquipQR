-- Forward-fix for 20260518120000 which created claim_quickbooks_invoice_status_events
-- with SET search_path = public, pg_temp instead of the project hardening convention
-- SET search_path = ''. All referenced objects are already schema-qualified so an
-- empty search_path is safe and eliminates the function_search_path_mutable advisory.
--
-- Idempotent: the DO block skips the ALTER when the function does not exist so this
-- migration is safe on any environment regardless of migration subset applied.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'claim_quickbooks_invoice_status_events'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_batch_size integer'
  ) THEN
    ALTER FUNCTION public.claim_quickbooks_invoice_status_events(integer)
      SET search_path = '';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) IS
  'SECURITY DEFINER with SET search_path = empty string. Returns slim columns (no raw_event) '
  'for up to p_batch_size eligible invoice status events '
  '(pending/error, plus processing rows stale >15 minutes for crash recovery), '
  'marking them processing and bumping attempts. Callable only by service_role.';

COMMIT;
