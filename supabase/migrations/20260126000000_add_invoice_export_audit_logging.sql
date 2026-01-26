-- ============================================================================
-- Migration: Add Audit Logging for Invoice Creation/Export
-- Issue: #496 - Compliance Self-Audit & Remediation
-- Description: Adds audit logging for QuickBooks invoice exports to track
--              user actions when invoices are created or updated.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create function to log invoice export actions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_invoice_export_audit(
  p_organization_id UUID,
  p_work_order_id UUID,
  p_action TEXT, -- 'CREATE' or 'UPDATE' (for invoice creation/update)
  p_quickbooks_invoice_id TEXT,
  p_quickbooks_invoice_number TEXT,
  p_realm_id TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_audit_id UUID;
  v_work_order_title TEXT;
  v_entity_name TEXT;
  v_changes JSONB;
  v_metadata JSONB;
BEGIN
  -- Get actor info
  SELECT * INTO v_actor FROM public.get_audit_actor_info();
  
  -- Get work order title for entity name
  SELECT title INTO v_work_order_title
  FROM public.work_orders
  WHERE id = p_work_order_id;
  
  v_entity_name := COALESCE(v_work_order_title, 'Work Order ' || p_work_order_id::TEXT);
  
  -- Build changes object
  v_changes := jsonb_build_object(
    'action', p_action,
    'quickbooks_invoice_id', p_quickbooks_invoice_id,
    'quickbooks_invoice_number', p_quickbooks_invoice_number,
    'realm_id', p_realm_id
  );
  
  -- Build metadata with IP address if provided
  v_metadata := jsonb_build_object(
    'work_order_id', p_work_order_id,
    'ip_address', p_ip_address
  );
  
  -- Insert audit record
  INSERT INTO public.audit_log (
    organization_id,
    entity_type,
    entity_id,
    entity_name,
    action,
    actor_id,
    actor_name,
    actor_email,
    changes,
    metadata
  ) VALUES (
    p_organization_id,
    'work_order', -- Using work_order as entity type since invoice is linked to work order
    p_work_order_id,
    v_entity_name,
    'UPDATE', -- Always use UPDATE since we're modifying work order by exporting invoice
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    v_changes,
    v_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_invoice_export_audit IS 
  'Logs audit entry when a work order is exported to QuickBooks as an invoice. '
  'Tracks user_id, action (CREATE/UPDATE), timestamp, and IP address for compliance.';

-- ============================================================================
-- PART 2: Add 'invoice_export' as a tracked entity type (optional enhancement)
-- ============================================================================
-- Note: We're using 'work_order' entity type for invoice exports since invoices
-- are created in QuickBooks, not our database. The audit log tracks the export
-- action on the work order that was exported.

COMMIT;
