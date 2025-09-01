-- Update the remove_organization_member_safely function to use 'general' notification type
CREATE OR REPLACE FUNCTION public.remove_organization_member_safely(user_uuid uuid, org_id uuid, removed_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Create audit log entry with 'general' notification type
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
    'general',
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
$function$;