
-- Update the team-based equipment creation policy to be more restrictive
-- Drop the current policy that allows all org members to create equipment
DROP POLICY IF EXISTS "team_members_create_equipment" ON equipment;

-- Create a more restrictive policy for equipment creation
CREATE POLICY "team_members_create_equipment" 
  ON equipment 
  FOR INSERT 
  WITH CHECK (
    -- Organization admins can create equipment and assign to any team or leave unassigned
    is_org_admin(auth.uid(), organization_id)
    OR
    -- Non-admin users must be team managers and must assign to a team they manage
    (
      is_org_member(auth.uid(), organization_id) 
      AND team_id IS NOT NULL
      AND team_id IN (
        SELECT tm.team_id 
        FROM team_members tm 
        WHERE tm.user_id = auth.uid() 
        AND tm.role = 'manager'
      )
    )
  );
