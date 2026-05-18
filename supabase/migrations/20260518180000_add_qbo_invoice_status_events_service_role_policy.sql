-- Forward-fix for 20260517100000 which granted GRANT ALL to service_role on
-- quickbooks_invoice_status_events but did not add an explicit RLS policy for
-- service_role. With RLS enabled and no service_role policy, INSERT/UPDATE from
-- Edge Functions using the service-role key would be silently blocked despite the
-- GRANT. Add a FOR ALL bypass policy matching the project-wide convention.

BEGIN;

DROP POLICY IF EXISTS "quickbooks_invoice_status_events_service_role_all"
  ON public.quickbooks_invoice_status_events;

CREATE POLICY "quickbooks_invoice_status_events_service_role_all"
  ON public.quickbooks_invoice_status_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "quickbooks_invoice_status_events_service_role_all"
  ON public.quickbooks_invoice_status_events IS
  'Allows service_role full row-level access (INSERT/UPDATE/SELECT/DELETE) for '
  'Edge Function workers that enqueue and process QuickBooks invoice status events. '
  'Authenticated-role policies in 20260517100000 restrict end-user access separately.';

COMMIT;
