-- Migration: Enforce work order assignee validation
-- 
-- This migration adds a trigger to validate work order assignments:
-- - If equipment has no team, assignment is blocked (assignee_id must be NULL)
-- - If equipment has a team, assignee must be either:
--   1. A team member with role 'manager' or 'technician'
--   2. An org admin/owner
--
-- Data Migration: Syncs team_id from equipment to all existing work orders
-- Note: Existing invalid assignee data is preserved (trigger only fires on future changes)
--       to avoid breaking existing workflows. Invalid assignments will be caught on next update.

-- Helper function to validate work order assignee
CREATE OR REPLACE FUNCTION public.is_valid_work_order_assignee(
  p_equipment_id UUID,
  p_organization_id UUID,
  p_assignee_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  -- If no assignee, always valid (unassigned)
  IF p_assignee_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get the equipment's team_id
  SELECT team_id INTO v_team_id
  FROM equipment
  WHERE id = p_equipment_id AND organization_id = p_organization_id;

  -- If equipment has no team, assignment is blocked
  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if assignee is an org admin/owner
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_assignee_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if assignee is a team member (manager/technician) of the equipment's team
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_team_id
      AND user_id = p_assignee_id
      AND role IN ('manager', 'technician')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Assignee is not valid
  RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_valid_work_order_assignee(UUID, UUID, UUID) TO authenticated;

-- Trigger function to validate work order assignments
CREATE OR REPLACE FUNCTION public.validate_work_order_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment_team_id UUID;
BEGIN
  -- Only validate when assignee_id or equipment_id changes
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       OLD.assignee_id IS DISTINCT FROM NEW.assignee_id OR
       OLD.equipment_id IS DISTINCT FROM NEW.equipment_id
     ))
  THEN
    -- Skip validation if assignee is NULL (unassigned is always allowed)
    IF NEW.assignee_id IS NULL THEN
      -- Also sync team_id from equipment (filter by organization_id for multi-tenancy)
      SELECT team_id INTO v_equipment_team_id
      FROM equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;
      
      NEW.team_id := v_equipment_team_id;
      RETURN NEW;
    END IF;

    -- Validate the assignee
    IF NOT public.is_valid_work_order_assignee(
      NEW.equipment_id,
      NEW.organization_id,
      NEW.assignee_id
    ) THEN
      -- Get equipment team_id for better error message (filter by organization_id for multi-tenancy)
      SELECT team_id INTO v_equipment_team_id
      FROM equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;

      IF v_equipment_team_id IS NULL THEN
        RAISE EXCEPTION 'Cannot assign work order: Equipment has no team. Assign a team to the equipment first.'
          USING ERRCODE = 'check_violation';
      ELSE
        RAISE EXCEPTION 'Invalid assignee: User must be a team member (manager/technician) or organization admin.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- Sync team_id from equipment (denormalized for filtering/display)
    -- Filter by organization_id for multi-tenancy security
    SELECT team_id INTO v_equipment_team_id
    FROM equipment
    WHERE id = NEW.equipment_id
      AND organization_id = NEW.organization_id;
    
    NEW.team_id := v_equipment_team_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists to ensure clean state)
DROP TRIGGER IF EXISTS trg_validate_work_order_assignee ON public.work_orders;

CREATE TRIGGER trg_validate_work_order_assignee
  BEFORE INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_work_order_assignee();

-- Add comment for documentation
COMMENT ON FUNCTION public.is_valid_work_order_assignee(UUID, UUID, UUID) IS 
  'Validates that an assignee is valid for a work order: must be a team member (manager/technician) of the equipment''s team or an org admin/owner. Returns FALSE if equipment has no team.';

COMMENT ON FUNCTION public.validate_work_order_assignee() IS 
  'Trigger function that enforces work order assignee validation rules and syncs team_id from equipment.';

COMMENT ON TRIGGER trg_validate_work_order_assignee ON public.work_orders IS 
  'Enforces that work order assignees are valid (team members or org admins) and syncs team_id from equipment.';

-- Data migration: Sync team_id from equipment to all existing work orders
-- This ensures existing work orders have accurate team_id values for filtering and display
-- NOTE: Filters by organization_id to enforce multi-tenancy even in migration context
UPDATE public.work_orders wo
SET team_id = e.team_id
FROM public.equipment e
WHERE wo.equipment_id = e.id
  AND wo.organization_id = e.organization_id
  AND (wo.team_id IS DISTINCT FROM e.team_id);
