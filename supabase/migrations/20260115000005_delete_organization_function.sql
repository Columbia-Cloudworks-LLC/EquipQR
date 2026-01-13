-- ============================================================================
-- Migration: Delete Organization Function
-- 
-- Purpose: Implement function for deleting an organization with proper
-- validation and audit trail.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Get Organization Deletion Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organization_deletion_stats(
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_user_id UUID;
  v_member_count INTEGER;
  v_equipment_count INTEGER;
  v_work_order_count INTEGER;
  v_team_count INTEGER;
  v_inventory_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate caller is the owner
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_current_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can view deletion stats');
  END IF;
  
  -- Count members (excluding owner)
  SELECT COUNT(*) INTO v_member_count
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND role != 'owner'
    AND status = 'active';
  
  -- Count equipment
  SELECT COUNT(*) INTO v_equipment_count
  FROM equipment
  WHERE organization_id = p_organization_id;
  
  -- Count work orders
  SELECT COUNT(*) INTO v_work_order_count
  FROM work_orders
  WHERE organization_id = p_organization_id;
  
  -- Count teams
  SELECT COUNT(*) INTO v_team_count
  FROM teams
  WHERE organization_id = p_organization_id;
  
  -- Count inventory items
  SELECT COUNT(*) INTO v_inventory_count
  FROM inventory_items
  WHERE organization_id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_count', v_member_count,
    'equipment_count', v_equipment_count,
    'work_order_count', v_work_order_count,
    'team_count', v_team_count,
    'inventory_count', v_inventory_count,
    'can_delete', v_member_count = 0
  );
END;
$$;

COMMENT ON FUNCTION public.get_organization_deletion_stats(UUID) IS 
  'Get statistics about what will be deleted when an organization is deleted.';

-- ============================================================================
-- PART 2: Delete Organization Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_organization(
  p_organization_id UUID,
  p_confirmation_name TEXT,
  p_force BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_user_id UUID;
  v_org_name TEXT;
  v_member_count INTEGER;
  v_equipment_count INTEGER;
  v_work_order_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate caller is the owner
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_current_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can delete the organization');
  END IF;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Validate confirmation name matches
  IF LOWER(TRIM(p_confirmation_name)) != LOWER(TRIM(v_org_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization name does not match');
  END IF;
  
  -- Count active members (excluding owner)
  SELECT COUNT(*) INTO v_member_count
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND role != 'owner'
    AND status = 'active';
  
  -- If there are other members and not forcing, reject
  IF v_member_count > 0 AND NOT p_force THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot delete organization with active members. Remove all members first or use force option.',
      'member_count', v_member_count
    );
  END IF;
  
  -- Get counts for audit
  SELECT COUNT(*) INTO v_equipment_count
  FROM equipment WHERE organization_id = p_organization_id;
  
  SELECT COUNT(*) INTO v_work_order_count
  FROM work_orders WHERE organization_id = p_organization_id;
  
  -- Check if owner has another organization
  -- If not, create a personal org before deletion
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = v_current_user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND om.organization_id != p_organization_id
  ) THEN
    -- Create new personal organization for owner
    DECLARE
      v_user_name TEXT;
      v_new_org_id UUID;
    BEGIN
      SELECT name INTO v_user_name
      FROM profiles WHERE id = v_current_user_id;
      
      INSERT INTO organizations (name, plan, member_count, max_members, features)
      VALUES (
        COALESCE(v_user_name, 'My') || '''s Organization',
        'free',
        1,
        5,
        ARRAY['Equipment Management', 'Work Orders', 'Team Management']
      )
      RETURNING id INTO v_new_org_id;
      
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES (v_new_org_id, v_current_user_id, 'owner', 'active');
    END;
  END IF;
  
  -- Delete the organization (CASCADE handles related data)
  DELETE FROM organizations WHERE id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Organization "' || v_org_name || '" has been deleted',
    'deleted_stats', jsonb_build_object(
      'equipment', v_equipment_count,
      'work_orders', v_work_order_count,
      'members_removed', v_member_count
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.delete_organization(UUID, TEXT, BOOLEAN) IS 
  'Delete an organization. Only the owner can call this. Requires name confirmation.';

-- ============================================================================
-- PART 3: Remove Member Function (for admins to remove members)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.remove_organization_member(
  p_organization_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_target_role TEXT;
  v_target_name TEXT;
  v_org_name TEXT;
  v_queue_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get current user's role
  SELECT role INTO v_current_user_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_current_user_id
    AND status = 'active';
  
  IF v_current_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this organization');
  END IF;
  
  -- Only owners and admins can remove members
  IF v_current_user_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only owners and admins can remove members');
  END IF;
  
  -- Get target user's role
  SELECT role INTO v_target_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND status = 'active';
  
  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;
  
  -- Cannot remove owner
  IF v_target_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the organization owner');
  END IF;
  
  -- Admins cannot remove other admins (only owners can)
  IF v_current_user_role = 'admin' AND v_target_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only owners can remove admins');
  END IF;
  
  -- Get user name and org name
  SELECT name INTO v_target_name
  FROM profiles WHERE id = p_user_id;
  
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  -- Queue for batch processing (same as leave_organization but forced)
  INSERT INTO user_departure_queue (
    organization_id,
    user_id,
    user_name,
    user_email,
    status
  )
  SELECT 
    p_organization_id,
    p_user_id,
    COALESCE(p.name, p.email, 'Unknown'),
    COALESCE(p.email, 'unknown@unknown.com'),
    'pending'
  FROM profiles p
  WHERE p.id = p_user_id
  RETURNING id INTO v_queue_id;
  
  -- Create audit record
  INSERT INTO member_removal_audit (
    organization_id,
    removed_user_id,
    removed_user_name,
    removed_user_role,
    removed_by,
    removal_reason
  ) VALUES (
    p_organization_id,
    p_user_id,
    COALESCE(v_target_name, 'Unknown'),
    v_target_role,
    v_current_user_id,
    COALESCE(p_reason, 'Removed by admin')
  );
  
  -- Remove from team_members
  DELETE FROM team_members
  WHERE user_id = p_user_id
    AND team_id IN (SELECT id FROM teams WHERE organization_id = p_organization_id);
  
  -- Remove from parts_managers
  DELETE FROM parts_managers
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Remove from notification_settings
  DELETE FROM notification_settings
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Remove from organization_members
  DELETE FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Notify the removed user
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    p_organization_id,
    p_user_id,
    'member_removed',
    'Removed from Organization',
    'You have been removed from ' || v_org_name || '.',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'organization_name', v_org_name,
      'removed_by', v_current_user_id,
      'reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', COALESCE(v_target_name, 'User') || ' has been removed from ' || v_org_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.remove_organization_member(UUID, UUID, TEXT) IS 
  'Remove a member from an organization. Only owners and admins can call this.';

COMMIT;
