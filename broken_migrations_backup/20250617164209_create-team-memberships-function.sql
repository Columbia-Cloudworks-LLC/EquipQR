
-- Create the missing get_user_team_memberships function
CREATE OR REPLACE FUNCTION public.get_user_team_memberships(user_uuid uuid, org_id uuid)
RETURNS TABLE(team_id uuid, team_name text, role text, joined_date timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT tm.team_id, t.name as team_name, tm.role::text, tm.joined_date
  FROM public.team_members tm
  JOIN public.teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_uuid 
    AND t.organization_id = org_id;
$$;
