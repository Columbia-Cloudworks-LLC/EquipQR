
-- Update equipment RLS policy to enforce team-based access
-- Drop existing policies that only check organization membership
DROP POLICY IF EXISTS "members_view_equipment" ON equipment;

-- Create new team-aware policy for viewing equipment
CREATE POLICY "team_members_view_equipment" 
  ON equipment 
  FOR SELECT 
  USING (
    -- Organization admins can see all equipment in their org
    is_org_admin(auth.uid(), organization_id)
    OR
    -- Team members can only see equipment assigned to their teams
    (
      is_org_member(auth.uid(), organization_id) 
      AND (
        team_id IS NULL -- Unassigned equipment visible to all org members
        OR 
        team_id IN (
          SELECT tm.team_id 
          FROM team_members tm 
          WHERE tm.user_id = auth.uid()
        )
      )
    )
  );

-- Update equipment insert policy to be team-aware
DROP POLICY IF EXISTS "members_create_equipment" ON equipment;

CREATE POLICY "team_members_create_equipment"
  ON equipment
  FOR INSERT
  WITH CHECK (
    -- Must be organization member
    is_org_member(auth.uid(), organization_id)
    AND (
      -- Either creating unassigned equipment
      team_id IS NULL
      OR
      -- Or assigning to a team the user belongs to (or is admin)
      is_org_admin(auth.uid(), organization_id)
      OR
      team_id IN (
        SELECT tm.team_id 
        FROM team_members tm 
        WHERE tm.user_id = auth.uid()
      )
    )
  );
