-- Migration: Allow org admin/owner as assignee when equipment has no team
--
-- Aligns DB validation with frontend: org admins/owners can be assigned to work orders
-- even when the equipment has no team. Previously is_valid_work_order_assignee returned
-- FALSE when equipment had no team before checking org admin, which caused assignment
-- to fail silently (trigger raised, update rolled back).
--
-- Option A: Check org admin/owner first; if true, return TRUE regardless of equipment team.

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
BEGIN
  -- If no assignee, always valid (unassigned)
  IF p_assignee_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if assignee is an org admin/owner first (they can be assigned regardless of equipment team)
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_assignee_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Get the equipment's team_id
  SELECT team_id INTO v_team_id
  FROM equipment
  WHERE id = p_equipment_id AND organization_id = p_organization_id;

  -- If equipment has no team, only org admins (already allowed above) are valid; others are not
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

-- Keep existing grant and comment
GRANT EXECUTE ON FUNCTION public.is_valid_work_order_assignee(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.is_valid_work_order_assignee(UUID, UUID, UUID) IS
  'Validates that an assignee is valid for a work order: org admin/owner (any equipment), or team member (manager/technician) when equipment has a team. Returns FALSE when equipment has no team and assignee is not an org admin/owner.';
