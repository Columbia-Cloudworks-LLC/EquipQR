-- =============================================================================
-- Migration: QuickBooks invoice reliability
-- Issues: #600, #624, #915
--
-- Adds QBO tax-status cache freshness, Work Order invoice mirror fields, a
-- verified webhook event queue, and an hourly invoice-status reconciliation job.
-- Rollback:
--   SELECT cron.unschedule('quickbooks-invoice-status-sync');
--   DROP FUNCTION IF EXISTS public.invoke_quickbooks_invoice_status_sync();
--   DROP TABLE IF EXISTS public.quickbooks_invoice_status_events;
--   ALTER TABLE public.work_orders DROP COLUMN IF EXISTS invoice_sync_error, DROP COLUMN IF EXISTS invoice_last_synced_at,
--     DROP COLUMN IF EXISTS invoice_due_date, DROP COLUMN IF EXISTS invoice_balance_cents, DROP COLUMN IF EXISTS invoice_paid_at,
--     DROP COLUMN IF EXISTS invoice_sent_at, DROP COLUMN IF EXISTS invoice_status, DROP COLUMN IF EXISTS quickbooks_realm_id,
--     DROP COLUMN IF EXISTS quickbooks_invoice_environment, DROP COLUMN IF EXISTS quickbooks_invoice_number,
--     DROP COLUMN IF EXISTS quickbooks_invoice_id;
--   ALTER TABLE public.customers DROP COLUMN IF EXISTS quickbooks_tax_status_synced_at;
-- =============================================================================

BEGIN;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS quickbooks_tax_status_synced_at timestamptz;

COMMENT ON COLUMN public.customers.quickbooks_tax_status_synced_at IS
  'Timestamp when EquipQR last confirmed QuickBooks Customer.Taxable for is_tax_exempt cache freshness.';

ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS quickbooks_invoice_id text,
ADD COLUMN IF NOT EXISTS quickbooks_invoice_number text,
ADD COLUMN IF NOT EXISTS quickbooks_invoice_environment text,
ADD COLUMN IF NOT EXISTS quickbooks_realm_id text,
ADD COLUMN IF NOT EXISTS invoice_status text,
ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS invoice_paid_at timestamptz,
ADD COLUMN IF NOT EXISTS invoice_balance_cents integer,
ADD COLUMN IF NOT EXISTS invoice_due_date date,
ADD COLUMN IF NOT EXISTS invoice_last_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS invoice_sync_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_orders_quickbooks_invoice_environment_check'
      AND conrelid = 'public.work_orders'::regclass
  ) THEN
    ALTER TABLE public.work_orders
    ADD CONSTRAINT work_orders_quickbooks_invoice_environment_check
    CHECK (
      quickbooks_invoice_environment IS NULL
      OR quickbooks_invoice_environment IN ('sandbox', 'production')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_orders_invoice_status_check'
      AND conrelid = 'public.work_orders'::regclass
  ) THEN
    ALTER TABLE public.work_orders
    ADD CONSTRAINT work_orders_invoice_status_check
    CHECK (
      invoice_status IS NULL
      OR invoice_status IN ('draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'voided')
    );
  END IF;
END;
$$;

COMMENT ON COLUMN public.work_orders.quickbooks_invoice_id IS
  'QuickBooks Invoice.Id mirrored from the latest successful export.';
COMMENT ON COLUMN public.work_orders.quickbooks_invoice_number IS
  'QuickBooks Invoice.DocNumber mirrored from the latest successful export.';
COMMENT ON COLUMN public.work_orders.quickbooks_invoice_environment IS
  'QuickBooks environment used for the mirrored invoice: sandbox or production.';
COMMENT ON COLUMN public.work_orders.quickbooks_realm_id IS
  'QuickBooks company realm id for the mirrored invoice.';
COMMENT ON COLUMN public.work_orders.invoice_status IS
  'Mirrored QBO invoice lifecycle status for Work Order payment visibility.';
COMMENT ON COLUMN public.work_orders.invoice_balance_cents IS
  'Mirrored QBO invoice Balance in cents.';
COMMENT ON COLUMN public.work_orders.invoice_last_synced_at IS
  'Timestamp when QBO invoice mirror fields were last refreshed.';
COMMENT ON COLUMN public.work_orders.invoice_sync_error IS
  'Last non-secret invoice status sync error, cleared on successful sync.';

CREATE INDEX IF NOT EXISTS idx_work_orders_org_invoice_status
  ON public.work_orders(organization_id, invoice_status)
  WHERE invoice_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_qbo_invoice_lookup
  ON public.work_orders(quickbooks_realm_id, quickbooks_invoice_id)
  WHERE quickbooks_realm_id IS NOT NULL AND quickbooks_invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.quickbooks_invoice_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  realm_id text NOT NULL,
  entity_name text NOT NULL,
  entity_id text NOT NULL,
  operation text NOT NULL,
  event_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  raw_event jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT quickbooks_invoice_status_events_entity_check
    CHECK (entity_name IN ('Invoice', 'Payment')),
  CONSTRAINT quickbooks_invoice_status_events_status_check
    CHECK (status IN ('pending', 'processing', 'processed', 'error'))
);

COMMENT ON TABLE public.quickbooks_invoice_status_events IS
  'Verified Intuit webhook events queued for QuickBooks invoice/payment status synchronization.';

CREATE INDEX IF NOT EXISTS idx_qbo_invoice_status_events_pending
  ON public.quickbooks_invoice_status_events(status, created_at)
  WHERE status IN ('pending', 'error');

CREATE INDEX IF NOT EXISTS idx_qbo_invoice_status_events_org_realm_entity
  ON public.quickbooks_invoice_status_events(organization_id, realm_id, entity_name, entity_id);

ALTER TABLE public.quickbooks_invoice_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quickbooks_invoice_status_events_select_admins" ON public.quickbooks_invoice_status_events;
CREATE POLICY "quickbooks_invoice_status_events_select_admins"
ON public.quickbooks_invoice_status_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = (SELECT auth.uid())
      AND om.organization_id = quickbooks_invoice_status_events.organization_id
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
);

DROP POLICY IF EXISTS "quickbooks_invoice_status_events_no_user_insert" ON public.quickbooks_invoice_status_events;
CREATE POLICY "quickbooks_invoice_status_events_no_user_insert"
ON public.quickbooks_invoice_status_events
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "quickbooks_invoice_status_events_no_user_update" ON public.quickbooks_invoice_status_events;
CREATE POLICY "quickbooks_invoice_status_events_no_user_update"
ON public.quickbooks_invoice_status_events
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

GRANT SELECT ON public.quickbooks_invoice_status_events TO authenticated;
GRANT ALL ON public.quickbooks_invoice_status_events TO service_role;

CREATE OR REPLACE FUNCTION public.update_quickbooks_invoice_status_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_quickbooks_invoice_status_events_updated_at
  ON public.quickbooks_invoice_status_events;
CREATE TRIGGER trigger_quickbooks_invoice_status_events_updated_at
  BEFORE UPDATE ON public.quickbooks_invoice_status_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quickbooks_invoice_status_events_updated_at();

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
  current_user_role text;
  cron_job_id text;
BEGIN
  SELECT rolname
  INTO current_user_role
  FROM pg_roles
  WHERE oid = current_user::oid;

  cron_job_id := current_setting('cron.job_id', true);

  IF current_user_role != 'postgres' OR cron_job_id IS NULL THEN
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

COMMENT ON FUNCTION public.invoke_quickbooks_invoice_status_sync() IS
  'Invokes the quickbooks-sync-invoice-status Edge Function hourly from pg_cron using vault-stored service_role_key and supabase_url.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'quickbooks-invoice-status-sync') THEN
    PERFORM cron.unschedule('quickbooks-invoice-status-sync');
  END IF;
END;
$$;

SELECT cron.schedule(
  'quickbooks-invoice-status-sync',
  '0 * * * *',
  $$SELECT public.invoke_quickbooks_invoice_status_sync();$$
);

COMMIT;
