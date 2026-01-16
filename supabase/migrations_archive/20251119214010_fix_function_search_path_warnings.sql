-- Migration: Fix Function Search Path Security Warnings
-- Purpose: Address Supabase security advisor warnings about mutable search_path
-- Functions fixed:
--   1. sync_work_order_primary_equipment
--   2. get_global_pm_template_names
--   3. list_pm_templates
-- Created: 2025-11-19

BEGIN;

-- =============================================================================
-- 1. Fix sync_work_order_primary_equipment function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_work_order_primary_equipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- When a new primary equipment is set or updated
    IF NEW.is_primary THEN
        -- First, unset any other primary equipment for this work order
        UPDATE public.work_order_equipment 
        SET is_primary = false 
        WHERE work_order_id = NEW.work_order_id 
          AND id != NEW.id 
          AND is_primary = true;
        
        -- Update the work_orders table with the new primary equipment
        UPDATE public.work_orders 
        SET equipment_id = NEW.equipment_id 
        WHERE id = NEW.work_order_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.sync_work_order_primary_equipment() IS 
'Trigger function to sync primary equipment to work_orders.equipment_id. Fixed search_path for security.';

-- =============================================================================
-- 2. Fix get_global_pm_template_names function
-- =============================================================================
-- This function returns names of global PM templates (where organization_id IS NULL)
-- Note: If the function already exists with a different signature, this will update it

CREATE OR REPLACE FUNCTION public.get_global_pm_template_names()
RETURNS TABLE(name text)
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT t.name
  FROM public.pm_checklist_templates t
  WHERE t.organization_id IS NULL
  ORDER BY t.name;
$function$;

COMMENT ON FUNCTION public.get_global_pm_template_names() IS 
'Returns names of global PM templates (organization_id IS NULL). Fixed search_path for security.';

-- =============================================================================
-- 3. Fix list_pm_templates function
-- =============================================================================
-- This function lists PM templates accessible to a user's organization
-- Includes both global templates and organization-specific templates
-- Note: Using actual table structure with template_data and is_protected fields

CREATE OR REPLACE FUNCTION public.list_pm_templates(org_id uuid)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  name text,
  description text,
  template_data jsonb,
  is_protected boolean,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT 
    t.id,
    t.organization_id,
    t.name,
    t.description,
    t.template_data,
    t.is_protected,
    t.created_by,
    t.updated_by,
    t.created_at,
    t.updated_at
  FROM public.pm_checklist_templates t
  WHERE t.organization_id IS NULL 
     OR t.organization_id = org_id
  ORDER BY t.organization_id NULLS FIRST, t.name;
$function$;

COMMENT ON FUNCTION public.list_pm_templates(uuid) IS 
'Lists PM templates accessible to an organization (global + org-specific). Fixed search_path for security.';

COMMIT;

