-- Fix audit_log foreign key to allow organization deletion while preserving audit trail
-- 
-- Problem: When deleting an organization, CASCADE deletes trigger audit functions
-- that try to INSERT new audit records with the organization_id being deleted,
-- violating the FK constraint.
--
-- Solution: Change the FK constraint to SET NULL on delete. This way:
-- 1. Existing audit logs are preserved (not deleted)
-- 2. The organization_id becomes NULL, indicating the org was deleted
-- 3. Full audit trail is maintained for regulatory compliance
-- 4. entity_id and other metadata still identify what was affected

-- Drop the existing foreign key constraint
ALTER TABLE public.audit_log
DROP CONSTRAINT IF EXISTS audit_log_organization_id_fkey;

-- Re-add with SET NULL on delete instead of CASCADE
-- This preserves audit records when the organization is deleted
ALTER TABLE public.audit_log
ADD CONSTRAINT audit_log_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
ON DELETE SET NULL;

-- Ensure organization_id column allows NULL (it should already, but be explicit)
ALTER TABLE public.audit_log
ALTER COLUMN organization_id DROP NOT NULL;

-- Add an index on organization_id for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_audit_log_organization_id 
ON public.audit_log(organization_id) 
WHERE organization_id IS NOT NULL;

-- Update the delete_organization function to also handle the case properly
-- The function should now work without disabling triggers
CREATE OR REPLACE FUNCTION public.delete_organization(
  p_organization_id UUID,
  p_confirmation_name TEXT,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      
      -- Register as personal organization
      INSERT INTO personal_organizations (user_id, organization_id)
      VALUES (v_current_user_id, v_new_org_id)
      ON CONFLICT (user_id) DO UPDATE SET organization_id = v_new_org_id;
      
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES (v_new_org_id, v_current_user_id, 'owner', 'active');
    END;
  END IF;
  
  -- Log the deletion before we delete (this audit entry will have NULL org_id after delete)
  INSERT INTO audit_log (
    organization_id,
    entity_type,
    entity_id,
    entity_name,
    action,
    actor_id,
    changes,
    metadata
  ) VALUES (
    p_organization_id,
    'organization',
    p_organization_id,
    v_org_name,
    'DELETE',
    v_current_user_id,
    jsonb_build_object(
      'equipment_deleted', v_equipment_count,
      'work_orders_deleted', v_work_order_count,
      'members_removed', v_member_count + 1  -- +1 for owner
    ),
    jsonb_build_object(
      'deleted_by', v_current_user_id,
      'force', p_force
    )
  );
  
  -- Delete the organization (CASCADE handles related data)
  -- Audit log entries will have organization_id set to NULL (SET NULL constraint)
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

-- Add comment
COMMENT ON FUNCTION public.delete_organization IS 
'Deletes an organization and all its data. Audit logs are preserved with NULL organization_id for regulatory compliance.';

COMMENT ON CONSTRAINT audit_log_organization_id_fkey ON public.audit_log IS 
'SET NULL on delete - preserves audit history when organization is deleted. NULL org_id indicates the organization was deleted.';

-- Update the log_audit_entry function to gracefully handle when organization is being deleted
-- This prevents FK violations when cascade delete triggers audit functions
CREATE OR REPLACE FUNCTION public.log_audit_entry(
  p_organization_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_action TEXT,
  p_changes JSONB,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_audit_id UUID;
  v_org_exists BOOLEAN;
  v_effective_org_id UUID;
BEGIN
  -- Get actor info
  SELECT * INTO v_actor FROM public.get_audit_actor_info();
  
  -- Check if the organization still exists (might be in middle of deletion)
  v_effective_org_id := p_organization_id;
  IF p_organization_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_organization_id) INTO v_org_exists;
    
    -- If org doesn't exist, set org_id to NULL to preserve the audit record
    -- This handles cascade deletes where the org is being deleted
    IF NOT v_org_exists THEN
      v_effective_org_id := NULL;
    END IF;
  END IF;
  
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
    v_effective_org_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    p_changes,
    CASE 
      WHEN v_effective_org_id IS NULL AND p_organization_id IS NOT NULL 
      THEN jsonb_build_object('original_org_id', p_organization_id) || p_metadata
      ELSE p_metadata
    END
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
  
EXCEPTION WHEN foreign_key_violation THEN
  -- If we still get FK violation (race condition), insert with NULL org_id
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
    NULL,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    p_changes,
    jsonb_build_object('original_org_id', p_organization_id) || p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_audit_entry IS 
'Logs an audit entry. Handles organization deletion gracefully by setting org_id to NULL if org is being deleted. Preserves original_org_id in metadata for deleted orgs.';
