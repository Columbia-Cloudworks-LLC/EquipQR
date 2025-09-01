
-- Create security definer functions for team membership checks
CREATE OR REPLACE FUNCTION public.get_user_organization_membership(user_uuid uuid)
RETURNS TABLE(organization_id uuid, role text, status text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT om.organization_id, om.role, om.status
  FROM organization_members om
  WHERE om.user_id = user_uuid AND om.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_user_team_memberships(user_uuid uuid, org_id uuid)
RETURNS TABLE(team_id uuid, team_name text, role text, joined_date timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tm.team_id, t.name as team_name, tm.role::text, tm.joined_date
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_uuid 
    AND t.organization_id = org_id;
$$;

CREATE OR REPLACE FUNCTION public.check_user_team_role(user_uuid uuid, team_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
      AND tm.role::text = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_team_access(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
  );
$$;
