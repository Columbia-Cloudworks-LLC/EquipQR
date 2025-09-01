
-- Step 1: Add author_name and assignee_name fields to preserve user names
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS assignee_name TEXT;

ALTER TABLE work_order_notes 
ADD COLUMN IF NOT EXISTS author_name TEXT;

ALTER TABLE equipment_notes 
ADD COLUMN IF NOT EXISTS author_name TEXT;

ALTER TABLE work_order_images 
ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT;

ALTER TABLE equipment_note_images 
ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT;

-- Step 2: Create supporting functions

-- Function to get teams where user is the only manager
CREATE OR REPLACE FUNCTION get_user_managed_teams(user_uuid uuid)
RETURNS TABLE(team_id uuid, team_name text, organization_id uuid, is_only_manager boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.organization_id,
    (
      SELECT COUNT(*) = 1
      FROM team_members tm2 
      WHERE tm2.team_id = t.id 
      AND tm2.role = 'manager'
    ) as is_only_manager
  FROM teams t
  JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid 
    AND tm.role = 'manager';
END;
$$;

-- Function to preserve user attribution in historical records
CREATE OR REPLACE FUNCTION preserve_user_attribution(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Get user name from profiles
  SELECT name INTO user_name 
  FROM profiles 
  WHERE id = user_uuid;
  
  IF user_name IS NULL THEN
    user_name := 'Unknown User';
  END IF;
  
  -- Update work orders created by user
  UPDATE work_orders 
  SET created_by_name = user_name
  WHERE created_by = user_uuid 
    AND created_by_name IS NULL;
  
  -- Update work orders assigned to user
  UPDATE work_orders 
  SET assignee_name = user_name
  WHERE assignee_id = user_uuid 
    AND assignee_name IS NULL;
  
  -- Update work order notes
  UPDATE work_order_notes 
  SET author_name = user_name
  WHERE author_id = user_uuid 
    AND author_name IS NULL;
  
  -- Update equipment notes
  UPDATE equipment_notes 
  SET author_name = user_name
  WHERE author_id = user_uuid 
    AND author_name IS NULL;
  
  -- Update work order images
  UPDATE work_order_images 
  SET uploaded_by_name = user_name
  WHERE uploaded_by = user_uuid 
    AND uploaded_by_name IS NULL;
  
  -- Update equipment note images
  UPDATE equipment_note_images 
  SET uploaded_by_name = user_name
  WHERE uploaded_by = user_uuid 
    AND uploaded_by_name IS NULL;
END;
$$;

-- Function to handle team manager removal
CREATE OR REPLACE FUNCTION handle_team_manager_removal(user_uuid uuid, org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  team_record RECORD;
  org_owner_id uuid;
  transfer_count INTEGER := 0;
  result jsonb;
BEGIN
  -- Get organization owner
  SELECT user_id INTO org_owner_id
  FROM organization_members
  WHERE organization_id = org_id 
    AND role = 'owner' 
    AND status = 'active'
  LIMIT 1;
  
  IF org_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization owner found');
  END IF;
  
  -- Handle teams where user is the only manager
  FOR team_record IN 
    SELECT team_id, team_name, is_only_manager
    FROM get_user_managed_teams(user_uuid)
    WHERE organization_id = org_id AND is_only_manager = true
  LOOP
    -- Add organization owner as manager if not already a member
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (team_record.team_id, org_owner_id, 'manager')
    ON CONFLICT (team_id, user_id) 
    DO UPDATE SET role = 'manager';
    
    transfer_count := transfer_count + 1;
  END LOOP;
  
  -- Remove user from all teams in the organization
  DELETE FROM team_members 
  WHERE user_id = user_uuid 
    AND team_id IN (
      SELECT id FROM teams WHERE organization_id = org_id
    );
  
  result := jsonb_build_object(
    'success', true,
    'teams_transferred', transfer_count,
    'new_manager_id', org_owner_id
  );
  
  RETURN result;
END;
$$;

-- Main function to remove organization member safely
CREATE OR REPLACE FUNCTION remove_organization_member_safely(
  user_uuid uuid, 
  org_id uuid, 
  removed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
  owner_count INTEGER;
  team_result jsonb;
  result jsonb;
BEGIN
  -- Get user details
  SELECT om.role, p.name 
  INTO user_role, user_name
  FROM organization_members om
  JOIN profiles p ON om.user_id = p.id
  WHERE om.user_id = user_uuid 
    AND om.organization_id = org_id 
    AND om.status = 'active';
  
  IF user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;
  
  -- Check if this is the last owner
  IF user_role = 'owner' THEN
    SELECT COUNT(*) INTO owner_count
    FROM organization_members
    WHERE organization_id = org_id 
      AND role = 'owner' 
      AND status = 'active';
    
    IF owner_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last owner of the organization');
    END IF;
  END IF;
  
  -- Preserve user attribution in historical records
  PERFORM preserve_user_attribution(user_uuid);
  
  -- Handle team management transfers
  SELECT handle_team_manager_removal(user_uuid, org_id) INTO team_result;
  
  IF NOT (team_result->>'success')::boolean THEN
    RETURN team_result;
  END IF;
  
  -- Remove user from organization
  DELETE FROM organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id;
  
  -- Create audit log entry
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    org_id,
    removed_by,
    'member_removal',
    'Member Removed',
    CONCAT(COALESCE(user_name, 'Unknown User'), ' was removed from the organization'),
    jsonb_build_object(
      'removed_user_id', user_uuid,
      'removed_user_name', user_name,
      'removed_user_role', user_role,
      'teams_transferred', team_result->'teams_transferred',
      'removed_by', removed_by,
      'timestamp', now()
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'removed_user_name', user_name,
    'removed_user_role', user_role,
    'teams_transferred', team_result->'teams_transferred',
    'new_manager_id', team_result->'new_manager_id'
  );
  
  RETURN result;
END;
$$;

-- Create audit trail table for member removals
CREATE TABLE IF NOT EXISTS member_removal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  removed_user_id uuid NOT NULL,
  removed_user_name TEXT NOT NULL,
  removed_user_role TEXT NOT NULL,
  removed_by uuid NOT NULL,
  teams_transferred INTEGER DEFAULT 0,
  new_manager_id uuid,
  removal_reason TEXT,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on audit table
ALTER TABLE member_removal_audit ENABLE ROW LEVEL SECURITY;

-- Allow org admins to view removal audit logs
CREATE POLICY "Org admins can view removal audit"
ON member_removal_audit FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = member_removal_audit.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
);

-- Allow system to insert audit logs
CREATE POLICY "System can insert removal audit"
ON member_removal_audit FOR INSERT
WITH CHECK (true);
