-- Explicit invoice business dates are independent of work-order/audit clocks.
-- The composite FK prevents billing metadata crossing organization boundaries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_id_organization
  ON public.work_orders (id, organization_id);

CREATE TABLE IF NOT EXISTS public.work_order_invoice_details (
  work_order_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  invoice_date date,
  due_date date,
  payment_term_id text,
  service_dates jsonb NOT NULL DEFAULT '{}'::jsonb,
  qb_line_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_order_invoice_details_work_order_fkey
    FOREIGN KEY (work_order_id, organization_id)
    REFERENCES public.work_orders (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT work_order_invoice_details_service_dates_object
    CHECK (jsonb_typeof(service_dates) = 'object'),
  CONSTRAINT work_order_invoice_details_qb_line_ids_object
    CHECK (jsonb_typeof(qb_line_ids) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_work_order_invoice_details_organization
  ON public.work_order_invoice_details (organization_id);

COMMENT ON TABLE public.work_order_invoice_details IS
  'Explicit invoice review input. Incomplete input may be saved; the export validates required dates. No business-date clock defaults.';
COMMENT ON COLUMN public.work_order_invoice_details.service_dates IS
  'Explicit YYYY-MM-DD service dates keyed by pm:<maintenance UUID>, labor, or parts.';
COMMENT ON COLUMN public.work_order_invoice_details.qb_line_ids IS
  'Server-owned stable mapping from source line keys to QuickBooks invoice line IDs. Clients cannot write it.';

-- Upserts include the identity columns, but may never move a persisted mapping
-- onto a different work order, including another work order in the same tenant.
CREATE OR REPLACE FUNCTION public.prevent_invoice_details_reassignment()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.work_order_id IS DISTINCT FROM OLD.work_order_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Invoice details cannot be reassigned to another work order or organization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_invoice_details_reassignment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_invoice_details_reassignment ON public.work_order_invoice_details;
CREATE TRIGGER prevent_invoice_details_reassignment
  BEFORE UPDATE ON public.work_order_invoice_details
  FOR EACH ROW EXECUTE FUNCTION public.prevent_invoice_details_reassignment();
DROP TRIGGER IF EXISTS update_work_order_invoice_details_updated_at ON public.work_order_invoice_details;
CREATE TRIGGER update_work_order_invoice_details_updated_at
  BEFORE UPDATE ON public.work_order_invoice_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.work_order_invoice_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_details_select ON public.work_order_invoice_details;
CREATE POLICY invoice_details_select ON public.work_order_invoice_details
  FOR SELECT TO authenticated
  USING (public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id));
DROP POLICY IF EXISTS invoice_details_insert ON public.work_order_invoice_details;
CREATE POLICY invoice_details_insert ON public.work_order_invoice_details
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id));
DROP POLICY IF EXISTS invoice_details_update ON public.work_order_invoice_details;
CREATE POLICY invoice_details_update ON public.work_order_invoice_details
  FOR UPDATE TO authenticated
  USING (public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id))
  WITH CHECK (public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id));

-- Remove default Supabase grants before adding the allowed client columns.
REVOKE ALL ON public.work_order_invoice_details FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.work_order_invoice_details TO authenticated;
GRANT INSERT (work_order_id, organization_id, invoice_date, due_date, payment_term_id, service_dates),
      UPDATE (work_order_id, organization_id, invoice_date, due_date, payment_term_id, service_dates)
  ON public.work_order_invoice_details TO authenticated;
GRANT ALL ON public.work_order_invoice_details TO service_role;
