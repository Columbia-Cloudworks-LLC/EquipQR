
-- First, let's add the team_id column to equipment table to establish team ownership
ALTER TABLE equipment ADD COLUMN team_id uuid REFERENCES teams(id);

-- Add team_id to work_orders table if not already present (it seems to exist already)
-- The work_orders table already has team_id column based on the schema

-- Create enhanced security definer functions for team-based access control
CREATE OR REPLACE FUNCTION public.get_user_team_ids(user_uuid uuid, org_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY_AGG(tm.team_id)
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_uuid 
    AND t.organization_id = org_id;
$$;

CREATE OR REPLACE FUNCTION public.user_has_team_equipment_access(user_uuid uuid, equipment_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = equipment_team_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_work_order_access(user_uuid uuid, work_order_team_id uuid, work_order_assignee_id uuid, work_order_created_by uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    -- User is assigned to the work order
    work_order_assignee_id = user_uuid OR
    -- User created the work order
    work_order_created_by = user_uuid OR
    -- User is a member of the team assigned to the work order
    (work_order_team_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.user_id = user_uuid 
        AND tm.team_id = work_order_team_id
    ))
  );
$$;

-- Drop all existing RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization teams" ON teams;
DROP POLICY IF EXISTS "Organization admins can manage teams" ON teams;
DROP POLICY IF EXISTS "Team managers can update their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Organization admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team managers can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Users can view organization equipment" ON equipment;
DROP POLICY IF EXISTS "Organization admins can manage equipment" ON equipment;
DROP POLICY IF EXISTS "Users can view organization work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can manage work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can delete work orders" ON work_orders;
DROP POLICY IF EXISTS "Assigned users can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans" ON scans;
DROP POLICY IF EXISTS "Users can view organization notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes" ON notes;
DROP POLICY IF EXISTS "Authors can update own notes" ON notes;

-- Create new comprehensive RLS policies with team-based isolation

-- Organizations policies (unchanged)
CREATE POLICY "Users can view their organizations" 
  ON organizations 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), id));

CREATE POLICY "Organization admins can update organizations" 
  ON organizations 
  FOR UPDATE 
  USING (public.user_is_organization_admin(auth.uid(), id));

-- Organization members policies (unchanged)
CREATE POLICY "Users can view organization members" 
  ON organization_members 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Organization admins can manage members" 
  ON organization_members 
  FOR ALL 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Teams policies (unchanged)
CREATE POLICY "Users can view organization teams" 
  ON teams 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Organization admins can manage teams" 
  ON teams 
  FOR ALL 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Team managers can update their teams" 
  ON teams 
  FOR UPDATE 
  USING (public.check_user_team_role(auth.uid(), id, 'manager'));

-- Team members policies (unchanged)
CREATE POLICY "Users can view team members" 
  ON team_members 
  FOR SELECT 
  USING (
    public.user_has_organization_access(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "Organization admins can manage team members" 
  ON team_members 
  FOR ALL 
  USING (
    public.user_is_organization_admin(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "Team managers can manage their team members" 
  ON team_members 
  FOR ALL 
  USING (public.check_user_team_role(auth.uid(), team_id, 'manager'));

-- NEW: Team-based equipment policies
CREATE POLICY "Users can view team equipment" 
  ON equipment 
  FOR SELECT 
  USING (
    -- Organization admins can see all equipment
    public.user_is_organization_admin(auth.uid(), organization_id) OR
    -- Team members can see their team's equipment
    (team_id IS NOT NULL AND public.user_has_team_equipment_access(auth.uid(), team_id)) OR
    -- Unassigned equipment visible to all org members
    (team_id IS NULL AND public.user_has_organization_access(auth.uid(), organization_id))
  );

CREATE POLICY "Organization admins can manage all equipment" 
  ON equipment 
  FOR ALL 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Team managers can manage their team equipment" 
  ON equipment 
  FOR UPDATE 
  USING (
    team_id IS NOT NULL AND 
    public.check_user_team_role(auth.uid(), team_id, 'manager')
  );

CREATE POLICY "Team technicians can update their team equipment status" 
  ON equipment 
  FOR UPDATE 
  USING (
    team_id IS NOT NULL AND 
    public.check_user_team_access(auth.uid(), team_id)
  );

-- NEW: Team-based work orders policies
CREATE POLICY "Users can view relevant work orders" 
  ON work_orders 
  FOR SELECT 
  USING (
    -- Organization admins can see all work orders
    public.user_is_organization_admin(auth.uid(), organization_id) OR
    -- Users can see work orders they have access to
    public.user_has_work_order_access(auth.uid(), team_id, assignee_id, created_by)
  );

CREATE POLICY "Users can create work orders" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    public.user_has_organization_access(auth.uid(), organization_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Organization admins can manage all work orders" 
  ON work_orders 
  FOR UPDATE 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Users can update relevant work orders" 
  ON work_orders 
  FOR UPDATE 
  USING (
    public.user_has_work_order_access(auth.uid(), team_id, assignee_id, created_by)
  );

CREATE POLICY "Organization admins can delete work orders" 
  ON work_orders 
  FOR DELETE 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Profiles policies (unchanged)
CREATE POLICY "Users can view all profiles" 
  ON profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

-- NEW: Team-based scans policies
CREATE POLICY "Users can view team equipment scans" 
  ON scans 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM equipment e 
      WHERE e.id = equipment_id 
      AND (
        public.user_is_organization_admin(auth.uid(), e.organization_id) OR
        (e.team_id IS NOT NULL AND public.user_has_team_equipment_access(auth.uid(), e.team_id)) OR
        (e.team_id IS NULL AND public.user_has_organization_access(auth.uid(), e.organization_id))
      )
    )
  );

CREATE POLICY "Users can create scans for accessible equipment" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM equipment e 
      WHERE e.id = equipment_id 
      AND (
        public.user_is_organization_admin(auth.uid(), e.organization_id) OR
        (e.team_id IS NOT NULL AND public.user_has_team_equipment_access(auth.uid(), e.team_id)) OR
        (e.team_id IS NULL AND public.user_has_organization_access(auth.uid(), e.organization_id))
      )
    )
  );

-- NEW: Team-based notes policies
CREATE POLICY "Users can view team equipment notes" 
  ON notes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM equipment e 
      WHERE e.id = equipment_id 
      AND (
        public.user_is_organization_admin(auth.uid(), e.organization_id) OR
        (e.team_id IS NOT NULL AND public.user_has_team_equipment_access(auth.uid(), e.team_id)) OR
        (e.team_id IS NULL AND public.user_has_organization_access(auth.uid(), e.organization_id))
      )
    )
  );

CREATE POLICY "Users can create notes for accessible equipment" 
  ON notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM equipment e 
      WHERE e.id = equipment_id 
      AND (
        public.user_is_organization_admin(auth.uid(), e.organization_id) OR
        (e.team_id IS NOT NULL AND public.user_has_team_equipment_access(auth.uid(), e.team_id)) OR
        (e.team_id IS NULL AND public.user_has_organization_access(auth.uid(), e.organization_id))
      )
    )
  );

CREATE POLICY "Authors can update own notes" 
  ON notes 
  FOR UPDATE 
  USING (author_id = auth.uid());
