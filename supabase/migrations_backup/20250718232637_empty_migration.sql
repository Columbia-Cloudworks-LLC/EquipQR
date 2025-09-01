
-- Update the team-based equipment access policy to be more restrictive
-- Drop the current policy that allows all org members to see unassigned equipment
DROP POLICY IF EXISTS "team_members_view_equipment" ON equipment;

-- Create a more restrictive policy where only admins can see unassigned equipment
CREATE POLICY "team_members_view_equipment" 
  ON equipment 
  FOR SELECT 
  USING (
    -- Organization admins can see all equipment in their org
    is_org_admin(auth.uid(), organization_id)
    OR
    -- Team members can only see equipment assigned to their specific teams
    (
      is_org_member(auth.uid(), organization_id) 
      AND team_id IS NOT NULL
      AND team_id IN (
        SELECT tm.team_id 
        FROM team_members tm 
        WHERE tm.user_id = auth.uid()
      )
    )
  );
