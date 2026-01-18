-- ============================================================================
-- Migration: Comprehensive Audit Trail System
-- 
-- Purpose: Creates a unified audit logging system to track all changes to
-- Equipment, Work Orders, Inventory, PM Checklists, and User/Permissions.
-- Supports regulatory compliance (OSHA, DOT, ISO) and accountability.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create audit_log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'equipment', 
    'work_order', 
    'inventory_item', 
    'preventative_maintenance',
    'organization_member',
    'team_member',
    'team',
    'pm_template'
  )),
  entity_id UUID NOT NULL,
  entity_name TEXT, -- Denormalized for display without joins
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT 'System', -- Denormalized to preserve after user deletion
  actor_email TEXT, -- For additional context
  changes JSONB NOT NULL DEFAULT '{}', -- {"field": {"old": "value", "new": "value"}}
  metadata JSONB DEFAULT '{}', -- Additional context (IP, user agent, related entities)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.audit_log IS 
  'Comprehensive audit trail for regulatory compliance. '
  'Tracks all changes to equipment, work orders, inventory, PM, and permissions. '
  'Records are append-only - no updates or deletes allowed.';

-- ============================================================================
-- PART 2: Create Indexes for Performance
-- ============================================================================

-- Primary query pattern: organization-wide audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_org_time 
  ON public.audit_log(organization_id, created_at DESC);

-- Entity-specific history queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
  ON public.audit_log(entity_type, entity_id, created_at DESC);

-- User activity lookup
CREATE INDEX IF NOT EXISTS idx_audit_log_actor 
  ON public.audit_log(actor_id, created_at DESC) 
  WHERE actor_id IS NOT NULL;

-- Composite index for filtered organization queries
CREATE INDEX IF NOT EXISTS idx_audit_log_org_type_time 
  ON public.audit_log(organization_id, entity_type, created_at DESC);

-- Partial indexes for common entity types
CREATE INDEX IF NOT EXISTS idx_audit_log_equipment 
  ON public.audit_log(organization_id, entity_id, created_at DESC) 
  WHERE entity_type = 'equipment';

CREATE INDEX IF NOT EXISTS idx_audit_log_work_orders 
  ON public.audit_log(organization_id, entity_id, created_at DESC) 
  WHERE entity_type = 'work_order';

-- ============================================================================
-- PART 3: Enable RLS and Create Policies
-- ============================================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view audit logs for their active organizations
CREATE POLICY "Users can view audit logs for their organizations"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM public.organization_members om
      WHERE om.user_id = (SELECT auth.uid())
      AND om.status = 'active'
    )
  );

-- Only system/triggers can insert audit logs (via SECURITY DEFINER functions)
-- No direct inserts from authenticated users
CREATE POLICY "System can insert audit logs"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Inserts only via SECURITY DEFINER trigger functions

-- No updates allowed - audit logs are immutable
-- No DELETE policy = no deletes allowed

-- ============================================================================
-- PART 4: Create Helper Function to Get Actor Info
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_actor_info()
RETURNS TABLE(actor_id UUID, actor_name TEXT, actor_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_name TEXT;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'System'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  SELECT p.name, u.email 
  INTO v_name, v_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_user_id;
  
  IF v_name IS NULL THEN
    v_name := COALESCE(v_email, 'Unknown User');
  END IF;
  
  RETURN QUERY SELECT v_user_id, v_name, v_email;
END;
$$;

-- ============================================================================
-- PART 5: Create Generic Audit Logging Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_entry(
  p_organization_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_action TEXT,
  p_changes JSONB,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_audit_id UUID;
BEGIN
  -- Get actor info
  SELECT * INTO v_actor FROM public.get_audit_actor_info();
  
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
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- ============================================================================
-- PART 6: Equipment Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_equipment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.name;
  ELSE
    v_entity_name := NEW.name;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', NULL, 'new', NEW.name),
      'status', jsonb_build_object('old', NULL, 'new', NEW.status),
      'location', jsonb_build_object('old', NULL, 'new', NEW.location),
      'manufacturer', jsonb_build_object('old', NULL, 'new', NEW.manufacturer),
      'model', jsonb_build_object('old', NULL, 'new', NEW.model),
      'serial_number', jsonb_build_object('old', NULL, 'new', NEW.serial_number),
      'installation_date', jsonb_build_object('old', NULL, 'new', NEW.installation_date),
      'warranty_expiration', jsonb_build_object('old', NULL, 'new', NEW.warranty_expiration),
      'notes', jsonb_build_object('old', NULL, 'new', NEW.notes),
      'custom_attributes', jsonb_build_object('old', NULL, 'new', NEW.custom_attributes)
    );
    v_metadata := jsonb_build_object(
      'team_id', NEW.team_id,
      'default_pm_template_id', NEW.default_pm_template_id,
      'customer_id', NEW.customer_id
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track fields that changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
    END IF;
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      v_changes := v_changes || jsonb_build_object('team_id', jsonb_build_object('old', OLD.team_id, 'new', NEW.team_id));
    END IF;
    IF OLD.warranty_expiration IS DISTINCT FROM NEW.warranty_expiration THEN
      v_changes := v_changes || jsonb_build_object('warranty_expiration', jsonb_build_object('old', OLD.warranty_expiration, 'new', NEW.warranty_expiration));
    END IF;
    IF OLD.working_hours IS DISTINCT FROM NEW.working_hours THEN
      v_changes := v_changes || jsonb_build_object('working_hours', jsonb_build_object('old', OLD.working_hours, 'new', NEW.working_hours));
    END IF;
    IF OLD.last_maintenance IS DISTINCT FROM NEW.last_maintenance THEN
      v_changes := v_changes || jsonb_build_object('last_maintenance', jsonb_build_object('old', OLD.last_maintenance, 'new', NEW.last_maintenance));
    END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('old', OLD.notes, 'new', NEW.notes));
    END IF;
    IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
      v_changes := v_changes || jsonb_build_object('image_url', jsonb_build_object('old', OLD.image_url, 'new', NEW.image_url));
    END IF;
    IF OLD.manufacturer IS DISTINCT FROM NEW.manufacturer THEN
      v_changes := v_changes || jsonb_build_object('manufacturer', jsonb_build_object('old', OLD.manufacturer, 'new', NEW.manufacturer));
    END IF;
    IF OLD.model IS DISTINCT FROM NEW.model THEN
      v_changes := v_changes || jsonb_build_object('model', jsonb_build_object('old', OLD.model, 'new', NEW.model));
    END IF;
    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
      v_changes := v_changes || jsonb_build_object('serial_number', jsonb_build_object('old', OLD.serial_number, 'new', NEW.serial_number));
    END IF;
    IF OLD.default_pm_template_id IS DISTINCT FROM NEW.default_pm_template_id THEN
      v_changes := v_changes || jsonb_build_object('default_pm_template_id', jsonb_build_object('old', OLD.default_pm_template_id, 'new', NEW.default_pm_template_id));
    END IF;
    IF OLD.installation_date IS DISTINCT FROM NEW.installation_date THEN
      v_changes := v_changes || jsonb_build_object('installation_date', jsonb_build_object('old', OLD.installation_date, 'new', NEW.installation_date));
    END IF;
    IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      v_changes := v_changes || jsonb_build_object('customer_id', jsonb_build_object('old', OLD.customer_id, 'new', NEW.customer_id));
    END IF;
    IF OLD.custom_attributes IS DISTINCT FROM NEW.custom_attributes THEN
      v_changes := v_changes || jsonb_build_object('custom_attributes', jsonb_build_object('old', OLD.custom_attributes, 'new', NEW.custom_attributes));
    END IF;
    IF OLD.last_known_location IS DISTINCT FROM NEW.last_known_location THEN
      v_changes := v_changes || jsonb_build_object('last_known_location', jsonb_build_object('old', OLD.last_known_location, 'new', NEW.last_known_location));
    END IF;
    
    -- Skip if no tracked fields changed (e.g., only updated_at changed)
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NULL),
      'status', jsonb_build_object('old', OLD.status, 'new', NULL),
      'manufacturer', jsonb_build_object('old', OLD.manufacturer, 'new', NULL),
      'model', jsonb_build_object('old', OLD.model, 'new', NULL),
      'serial_number', jsonb_build_object('old', OLD.serial_number, 'new', NULL),
      'location', jsonb_build_object('old', OLD.location, 'new', NULL),
      'custom_attributes', jsonb_build_object('old', OLD.custom_attributes, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'equipment',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create equipment trigger
DROP TRIGGER IF EXISTS audit_equipment_trigger ON public.equipment;
CREATE TRIGGER audit_equipment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_equipment_changes();

-- ============================================================================
-- PART 7: Work Order Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_work_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.title;
  ELSE
    v_entity_name := NEW.title;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'title', jsonb_build_object('old', NULL, 'new', NEW.title),
      'status', jsonb_build_object('old', NULL, 'new', NEW.status),
      'priority', jsonb_build_object('old', NULL, 'new', NEW.priority),
      'equipment_id', jsonb_build_object('old', NULL, 'new', NEW.equipment_id)
    );
    v_metadata := jsonb_build_object(
      'equipment_id', NEW.equipment_id,
      'team_id', NEW.team_id,
      'created_by', NEW.created_by
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track fields that changed
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      v_changes := v_changes || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      v_changes := v_changes || jsonb_build_object('assignee_id', jsonb_build_object('old', OLD.assignee_id, 'new', NEW.assignee_id));
      v_changes := v_changes || jsonb_build_object('assignee_name', jsonb_build_object('old', OLD.assignee_name, 'new', NEW.assignee_name));
    END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      v_changes := v_changes || jsonb_build_object('due_date', jsonb_build_object('old', OLD.due_date, 'new', NEW.due_date));
    END IF;
    IF OLD.completed_date IS DISTINCT FROM NEW.completed_date THEN
      v_changes := v_changes || jsonb_build_object('completed_date', jsonb_build_object('old', OLD.completed_date, 'new', NEW.completed_date));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      v_changes := v_changes || jsonb_build_object('team_id', jsonb_build_object('old', OLD.team_id, 'new', NEW.team_id));
    END IF;
    IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
      v_changes := v_changes || jsonb_build_object('estimated_hours', jsonb_build_object('old', OLD.estimated_hours, 'new', NEW.estimated_hours));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('equipment_id', NEW.equipment_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'title', jsonb_build_object('old', OLD.title, 'new', NULL),
      'status', jsonb_build_object('old', OLD.status, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'work_order',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create work order trigger
DROP TRIGGER IF EXISTS audit_work_order_trigger ON public.work_orders;
CREATE TRIGGER audit_work_order_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_work_order_changes();

-- ============================================================================
-- PART 8: Inventory Item Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_inventory_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.name;
  ELSE
    v_entity_name := NEW.name;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', NULL, 'new', NEW.name),
      'sku', jsonb_build_object('old', NULL, 'new', NEW.sku),
      'quantity_on_hand', jsonb_build_object('old', NULL, 'new', NEW.quantity_on_hand),
      'low_stock_threshold', jsonb_build_object('old', NULL, 'new', NEW.low_stock_threshold)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track fields that changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.quantity_on_hand IS DISTINCT FROM NEW.quantity_on_hand THEN
      v_changes := v_changes || jsonb_build_object('quantity_on_hand', jsonb_build_object('old', OLD.quantity_on_hand, 'new', NEW.quantity_on_hand));
    END IF;
    IF OLD.low_stock_threshold IS DISTINCT FROM NEW.low_stock_threshold THEN
      v_changes := v_changes || jsonb_build_object('low_stock_threshold', jsonb_build_object('old', OLD.low_stock_threshold, 'new', NEW.low_stock_threshold));
    END IF;
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
    END IF;
    IF OLD.default_unit_cost IS DISTINCT FROM NEW.default_unit_cost THEN
      v_changes := v_changes || jsonb_build_object('default_unit_cost', jsonb_build_object('old', OLD.default_unit_cost, 'new', NEW.default_unit_cost));
    END IF;
    IF OLD.sku IS DISTINCT FROM NEW.sku THEN
      v_changes := v_changes || jsonb_build_object('sku', jsonb_build_object('old', OLD.sku, 'new', NEW.sku));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NULL),
      'sku', jsonb_build_object('old', OLD.sku, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'inventory_item',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create inventory item trigger
DROP TRIGGER IF EXISTS audit_inventory_trigger ON public.inventory_items;
CREATE TRIGGER audit_inventory_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_inventory_changes();

-- ============================================================================
-- PART 9: Preventative Maintenance Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_pm_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
  v_org_id UUID;
BEGIN
  -- Get organization_id from work_order
  IF TG_OP = 'DELETE' THEN
    SELECT wo.organization_id INTO v_org_id
    FROM public.work_orders wo
    WHERE wo.id = OLD.work_order_id;
    v_entity_name := 'PM for Work Order';
  ELSE
    SELECT wo.organization_id INTO v_org_id
    FROM public.work_orders wo
    WHERE wo.id = NEW.work_order_id;
    v_entity_name := 'PM for Work Order';
  END IF;
  
  -- Skip if we can't determine organization
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'status', jsonb_build_object('old', NULL, 'new', NEW.status),
      'template_id', jsonb_build_object('old', NULL, 'new', NEW.template_id)
    );
    v_metadata := jsonb_build_object('work_order_id', NEW.work_order_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.completed_at IS DISTINCT FROM NEW.completed_at THEN
      v_changes := v_changes || jsonb_build_object('completed_at', jsonb_build_object('old', OLD.completed_at, 'new', NEW.completed_at));
    END IF;
    IF OLD.completed_by IS DISTINCT FROM NEW.completed_by THEN
      v_changes := v_changes || jsonb_build_object('completed_by', jsonb_build_object('old', OLD.completed_by, 'new', NEW.completed_by));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('work_order_id', NEW.work_order_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'status', jsonb_build_object('old', OLD.status, 'new', NULL)
    );
    v_metadata := jsonb_build_object('work_order_id', OLD.work_order_id);
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    v_org_id,
    'preventative_maintenance',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create PM trigger
DROP TRIGGER IF EXISTS audit_pm_trigger ON public.preventative_maintenance;
CREATE TRIGGER audit_pm_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.preventative_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_pm_changes();

-- ============================================================================
-- PART 10: Organization Member Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_org_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Get member name from profiles
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = OLD.user_id;
  ELSE
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  
  v_entity_name := COALESCE(v_entity_name, 'Unknown User');
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', NULL, 'new', NEW.role),
      'status', jsonb_build_object('old', NULL, 'new', NEW.status)
    );
    v_metadata := jsonb_build_object('user_id', NEW.user_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      v_changes := v_changes || jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('user_id', NEW.user_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', OLD.role, 'new', NULL),
      'status', jsonb_build_object('old', OLD.status, 'new', NULL)
    );
    v_metadata := jsonb_build_object('user_id', OLD.user_id);
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'organization_member',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create org member trigger
DROP TRIGGER IF EXISTS audit_org_member_trigger ON public.organization_members;
CREATE TRIGGER audit_org_member_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_org_member_changes();

-- ============================================================================
-- PART 11: Team Member Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_team_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
  v_org_id UUID;
BEGIN
  -- Get organization_id from team
  IF TG_OP = 'DELETE' THEN
    SELECT t.organization_id INTO v_org_id
    FROM public.teams t
    WHERE t.id = OLD.team_id;
    
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = OLD.user_id;
  ELSE
    SELECT t.organization_id INTO v_org_id
    FROM public.teams t
    WHERE t.id = NEW.team_id;
    
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  
  -- Skip if we can't determine organization
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_entity_name := COALESCE(v_entity_name, 'Unknown User');
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', NULL, 'new', NEW.role)
    );
    v_metadata := jsonb_build_object('team_id', NEW.team_id, 'user_id', NEW.user_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      v_changes := v_changes || jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('team_id', NEW.team_id, 'user_id', NEW.user_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', OLD.role, 'new', NULL)
    );
    v_metadata := jsonb_build_object('team_id', OLD.team_id, 'user_id', OLD.user_id);
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    v_org_id,
    'team_member',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create team member trigger
DROP TRIGGER IF EXISTS audit_team_member_trigger ON public.team_members;
CREATE TRIGGER audit_team_member_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_team_member_changes();

-- ============================================================================
-- PART 12: Team Audit Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_team_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.name;
  ELSE
    v_entity_name := NEW.name;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', NULL, 'new', NEW.name),
      'description', jsonb_build_object('old', NULL, 'new', NEW.description)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'team',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create team trigger
DROP TRIGGER IF EXISTS audit_team_trigger ON public.teams;
CREATE TRIGGER audit_team_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_team_changes();

COMMIT;
