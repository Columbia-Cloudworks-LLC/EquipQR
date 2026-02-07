-- Migration: Allow org admin/owner as assignee when equipment has no team
--
-- Aligns DB validation with frontend: org admins/owners can be assigned to work orders
-- even when the equipment has no team. Previously is_valid_work_order_assignee returned
-- FALSE when equipment had no team before checking org admin, which caused assignment
-- to fail silently (trigger raised, update rolled back).
--
-- Approach: First verify equipment belongs to the specified organization (cross-tenant
-- guard), then check org admin/owner; if true, return TRUE regardless of equipment team.
--
-- Security: The equipment/org guard prevents cross-tenant assignment if work_orders has
-- mismatched equipment_id / organization_id (no compound FK enforces consistency).

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
  v_equipment_exists BOOLEAN;
BEGIN
  -- If no assignee, always valid (unassigned)
  IF p_assignee_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Guard: verify equipment belongs to the specified organization.
  -- This prevents cross-tenant assignment if work_orders has mismatched
  -- equipment_id / organization_id (no compound FK enforces consistency).
  SELECT EXISTS (
    SELECT 1 FROM equipment
    WHERE id = p_equipment_id
      AND organization_id = p_organization_id
  ) INTO v_equipment_exists;

  IF NOT v_equipment_exists THEN
    RETURN FALSE;
  END IF;

  -- Check if assignee is an org admin/owner (they can be assigned regardless of equipment team)
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_assignee_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Get the equipment's team_id (equipment existence already verified above)
  SELECT team_id INTO v_team_id
  FROM equipment
  WHERE id = p_equipment_id AND organization_id = p_organization_id;

  -- If equipment has no team: only org admins/owners (already allowed above) are valid.
  -- Regular team members (manager/technician) cannot be assigned when equipment has no team.
  IF v_team_id IS NULL THEN
    RETURN FALSE;
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

-- RLS Policy Verification Note:
-- This function is used by the trigger trg_validate_work_order_assignee (via validate_work_order_assignee())
-- to validate work order assignees before INSERT/UPDATE operations. While this function is SECURITY DEFINER
-- and properly validates assignment rules, ensure that:
-- 1. RLS policies on the work_orders table allow updates when this validation function returns TRUE
-- 2. The trigger trg_validate_work_order_assignee properly blocks invalid assignments by raising exceptions
-- 3. The trigger function validate_work_order_assignee() correctly calls this function and handles its return value
-- The trigger raises a check_violation exception when validation fails, which should prevent invalid assignments
-- even if RLS policies would otherwise allow the update.

-- Keep existing grant and comment
GRANT EXECUTE ON FUNCTION public.is_valid_work_order_assignee(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.is_valid_work_order_assignee(UUID, UUID, UUID) IS
  'Validates that an assignee is valid for a work order: first verifies equipment belongs to the specified organization (cross-tenant guard), then allows org admin/owner (any equipment) or team member (manager/technician) when equipment has a team. Returns FALSE when equipment does not belong to the org, when equipment has no team and assignee is not an org admin/owner, or when assignee is not a valid team member.';
