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
  p_ip_address TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL -- Optional: explicitly pass user ID when called from service-role context
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
  v_user_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_is_service_role BOOLEAN;
  v_actor_belongs_to_org BOOLEAN;
BEGIN
  -- Security: Only service_role can call this function directly
  -- This prevents authenticated clients from bypassing permission checks
  v_is_service_role := (auth.role() = 'service_role');
  
  IF NOT v_is_service_role THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by service_role';
  END IF;
  
  -- Authorization: If p_actor_id is provided, verify the actor belongs to the organization
  IF p_actor_id IS NOT NULL THEN
    -- Verify that the actor is a member of the organization
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
        AND om.user_id = p_actor_id
        AND om.status = 'active'
    ) INTO v_actor_belongs_to_org;
    
    IF NOT v_actor_belongs_to_org THEN
      RAISE EXCEPTION 'Access denied: Actor % is not a member of organization %', 
        p_actor_id, p_organization_id;
    END IF;
    
    -- Use explicitly provided actor ID (for service-role context)
    v_user_id := p_actor_id;
    -- Fetch user details
    SELECT p.name, u.email 
    INTO v_name, v_email
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = v_user_id;
    
    IF v_name IS NULL THEN
      v_name := COALESCE(v_email, 'Unknown User');
    END IF;
  ELSE
    -- Fall back to get_audit_actor_info() which uses auth.uid()
    -- Note: In service-role context, auth.uid() will be NULL, so this will create a System entry
    SELECT * INTO v_actor FROM public.get_audit_actor_info();
    -- Extract values from v_actor for consistent handling
    v_user_id := v_actor.actor_id;
    v_name := v_actor.actor_name;
    v_email := v_actor.actor_email;
  END IF;
  
  -- Get work order title for entity name, scoped to organization
  SELECT title INTO v_work_order_title
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id;
  
  -- Validate that work order exists and belongs to the organization
  IF v_work_order_title IS NULL THEN
    RAISE EXCEPTION 'Work order % does not exist or does not belong to organization %', 
      p_work_order_id, p_organization_id;
  END IF;
  
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
  
  -- Insert audit record using variables directly (avoids RECORD type issues)
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
    v_user_id,
    COALESCE(v_name, 'System'),
    v_email,
    v_changes,
    v_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_invoice_export_audit IS 
  'Logs audit entry when a work order is exported to QuickBooks as an invoice. '
  'Tracks user_id, action (CREATE/UPDATE), timestamp, and IP address for compliance. '
  'This function is restricted to service_role only to prevent unauthorized audit log forging.';

-- ============================================================================
-- PART 2: Restrict EXECUTE privileges to service_role only
-- ============================================================================
-- Revoke default EXECUTE privileges from anon and authenticated roles
-- Only service_role (used by edge functions) can call this function

REVOKE EXECUTE ON FUNCTION public.log_invoice_export_audit FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_invoice_export_audit TO service_role;

-- ============================================================================
-- PART 3: Add 'invoice_export' as a tracked entity type (optional enhancement)
-- ============================================================================
-- Note: We're using 'work_order' entity type for invoice exports since invoices
-- are created in QuickBooks, not our database. The audit log tracks the export
-- action on the work order that was exported.

COMMIT;
