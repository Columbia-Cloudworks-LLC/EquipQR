-- Simple purchase requests for inventory restock (#1442)
-- Supports a thin linear lifecycle: requested -> ordered -> received | cancelled.
-- Restricted to Parts Managers and Org Owners/Admins for mutations, and inventory viewers for reads.

CREATE TABLE IF NOT EXISTS public.inventory_purchase_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  vendor_name text,
  notes text,
  status text DEFAULT 'requested'::text NOT NULL CHECK (status IN ('requested', 'ordered', 'received', 'cancelled')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ordered_at timestamp with time zone,
  ordered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at timestamp with time zone,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_quantity integer CHECK (received_quantity IS NULL OR received_quantity > 0),
  invoice_number text,
  received_unit_cost numeric(12,2) CHECK (received_unit_cost IS NULL OR received_unit_cost >= 0),
  inventory_transaction_id uuid REFERENCES public.inventory_transactions(id) ON DELETE SET NULL,
  cancelled_at timestamp with time zone,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.inventory_purchase_requests OWNER TO postgres;

COMMENT ON TABLE public.inventory_purchase_requests IS 'Lightweight inventory restock purchase requests (one inventory item per request; linear status flow requested -> ordered -> received | cancelled).';

CREATE INDEX IF NOT EXISTS idx_inventory_purchase_requests_organization_status
  ON public.inventory_purchase_requests USING btree (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_purchase_requests_inventory_item_id
  ON public.inventory_purchase_requests USING btree (inventory_item_id);

ALTER TABLE public.inventory_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_purchase_requests_select
  ON public.inventory_purchase_requests
  FOR SELECT
  USING (public.can_access_inventory(organization_id));

CREATE POLICY inventory_purchase_requests_insert
  ON public.inventory_purchase_requests
  FOR INSERT
  WITH CHECK (
    public.can_manage_inventory(organization_id)
    AND created_by = (SELECT auth.uid() AS uid)
    AND EXISTS (
      SELECT 1
      FROM public.inventory_items ii
      WHERE ii.id = inventory_item_id
        AND ii.organization_id = inventory_purchase_requests.organization_id
    )
  );

CREATE POLICY inventory_purchase_requests_update
  ON public.inventory_purchase_requests
  FOR UPDATE
  USING (public.can_manage_inventory(organization_id))
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY inventory_purchase_requests_delete
  ON public.inventory_purchase_requests
  FOR DELETE
  USING (public.is_org_operational_admin((SELECT auth.uid() AS uid), organization_id));

CREATE OR REPLACE FUNCTION public.receive_inventory_purchase_request(
  p_request_id uuid,
  p_received_quantity integer,
  p_invoice_number text DEFAULT NULL,
  p_received_unit_cost numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS public.inventory_purchase_requests
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_request public.inventory_purchase_requests%ROWTYPE;
  v_reason text;
  v_invoice_clean text;
  v_notes_clean text;
  v_transaction_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_received_quantity IS NULL OR p_received_quantity <= 0 THEN
    RAISE EXCEPTION 'Received quantity must be greater than zero';
  END IF;

  IF p_received_unit_cost IS NOT NULL AND p_received_unit_cost < 0 THEN
    RAISE EXCEPTION 'Received unit cost cannot be negative';
  END IF;

  SELECT *
  INTO v_request
  FROM public.inventory_purchase_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Purchase request not found: %', p_request_id;
  END IF;

  IF NOT public.can_manage_inventory(v_request.organization_id, v_user_id) THEN
    RAISE EXCEPTION 'User does not have permission to receive inventory purchase requests';
  END IF;

  IF v_request.status NOT IN ('requested', 'ordered') THEN
    RAISE EXCEPTION 'Purchase request cannot be received from status: %', v_request.status;
  END IF;

  v_invoice_clean := NULLIF(BTRIM(COALESCE(p_invoice_number, '')), '');
  v_notes_clean := NULLIF(BTRIM(COALESCE(p_notes, '')), '');

  v_reason := 'Restock from purchase request';
  IF v_invoice_clean IS NOT NULL THEN
    v_reason := v_reason || ' (Invoice #' || v_invoice_clean || ')';
  END IF;
  IF v_notes_clean IS NOT NULL THEN
    v_reason := v_reason || ': ' || v_notes_clean;
  END IF;

  -- Atomically increment inventory_items.quantity_on_hand and record restock transaction
  PERFORM public.adjust_inventory_quantity(
    v_request.inventory_item_id,
    p_received_quantity,
    v_reason,
    NULL
  );

  SELECT it.id
  INTO v_transaction_id
  FROM public.inventory_transactions it
  WHERE it.inventory_item_id = v_request.inventory_item_id
    AND it.organization_id = v_request.organization_id
    AND it.user_id = v_user_id
    AND it.transaction_type = 'restock'
    AND it.change_amount = p_received_quantity
  ORDER BY it.created_at DESC, it.id DESC
  LIMIT 1;

  IF p_received_unit_cost IS NOT NULL THEN
    UPDATE public.inventory_items
    SET
      default_unit_cost = p_received_unit_cost,
      updated_at = now()
    WHERE id = v_request.inventory_item_id
      AND organization_id = v_request.organization_id;
  END IF;

  UPDATE public.inventory_purchase_requests
  SET
    status = 'received',
    received_at = now(),
    received_by = v_user_id,
    received_quantity = p_received_quantity,
    invoice_number = COALESCE(v_invoice_clean, invoice_number),
    received_unit_cost = COALESCE(p_received_unit_cost, received_unit_cost),
    inventory_transaction_id = v_transaction_id,
    notes = COALESCE(v_notes_clean, notes),
    updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

ALTER FUNCTION public.receive_inventory_purchase_request(uuid, integer, text, numeric, text) OWNER TO postgres;

COMMENT ON FUNCTION public.receive_inventory_purchase_request(uuid, integer, text, numeric, text) IS 'Atomically receives an inventory purchase request, creates a restock inventory transaction, increments quantity_on_hand, optionally updates default_unit_cost, and marks the request received.';

REVOKE ALL ON FUNCTION public.receive_inventory_purchase_request(uuid, integer, text, numeric, text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.receive_inventory_purchase_request(uuid, integer, text, numeric, text) TO authenticated;
GRANT ALL ON FUNCTION public.receive_inventory_purchase_request(uuid, integer, text, numeric, text) TO service_role;

GRANT ALL ON TABLE public.inventory_purchase_requests TO anon;
GRANT ALL ON TABLE public.inventory_purchase_requests TO authenticated;
GRANT ALL ON TABLE public.inventory_purchase_requests TO service_role;
