
-- Fixed RLS policies to prevent infinite recursion
-- This migration consolidates and corrects all RLS policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Security definer functions (updated to prevent recursion)
CREATE OR REPLACE FUNCTION public.get_user_organization_role(user_uuid uuid, org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT om.role
  FROM organization_members om
  WHERE om.user_id = user_uuid 
    AND om.organization_id = org_id 
    AND om.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_organization_access(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_organization_admin(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$$;

-- Organization policies
CREATE POLICY "Users can view their organizations" 
  ON organizations 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), id));

CREATE POLICY "Organization admins can update organizations" 
  ON organizations 
  FOR UPDATE 
  USING (public.user_is_organization_admin(auth.uid(), id));

-- Organization members policies
CREATE POLICY "Users can view organization members" 
  ON organization_members 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Organization admins can manage members" 
  ON organization_members 
  FOR ALL 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Teams policies
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

-- Team members policies
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

-- Equipment policies
CREATE POLICY "Users can view organization equipment" 
  ON equipment 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Organization admins can manage equipment" 
  ON equipment 
  FOR ALL 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Work orders policies
CREATE POLICY "Users can view organization work orders" 
  ON work_orders 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Users can create work orders" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    public.user_has_organization_access(auth.uid(), organization_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Organization admins can update work orders" 
  ON work_orders 
  FOR UPDATE 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Organization admins can delete work orders" 
  ON work_orders 
  FOR DELETE 
  USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Assigned users can update work orders" 
  ON work_orders 
  FOR UPDATE 
  USING (
    assignee_id = auth.uid() OR
    public.check_user_team_access(auth.uid(), team_id)
  );

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
  ON profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

-- Scans policies
CREATE POLICY "Users can view organization scans" 
  ON scans 
  FOR SELECT 
  USING (
    public.user_has_organization_access(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "Users can create scans" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() AND
    public.user_has_organization_access(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

-- Notes policies
CREATE POLICY "Users can view organization notes" 
  ON notes 
  FOR SELECT 
  USING (
    public.user_has_organization_access(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "Users can create notes" 
  ON notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() AND
    public.user_has_organization_access(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "Authors can update own notes" 
  ON notes 
  FOR UPDATE 
  USING (author_id = auth.uid());
