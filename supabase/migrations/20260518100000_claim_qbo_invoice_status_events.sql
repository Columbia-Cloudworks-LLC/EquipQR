-- Atomically claim QuickBooks invoice status webhook events for processing.
-- Uses row locks (FOR UPDATE SKIP LOCKED) so concurrent sync workers cannot
-- process the same event.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_quickbooks_invoice_status_events(p_batch_size integer)
RETURNS SETOF public.quickbooks_invoice_status_events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH picked AS (
    SELECT e.id
    FROM public.quickbooks_invoice_status_events e
    WHERE e.status IN ('pending', 'error')
      AND e.attempts < 5
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
  RETURNING u.*;
$$;

COMMENT ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) IS
  'Locks and returns up to p_batch_size eligible quickbooks_invoice_status_events rows, '
  'marking them processing and incrementing attempts. Callable only by service_role.';

REVOKE ALL ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quickbooks_invoice_status_events(integer) TO service_role;

COMMIT;
