
-- Step 1: Temporarily disable RLS on organization_members to break the recursion
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing RLS policies to start fresh
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

-- Step 3: Update security definer functions to use direct table access (bypassing RLS)
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

-- Step 4: Re-enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Step 5: Create consolidated, non-recursive RLS policies

-- Organizations policies
CREATE POLICY "Users can view their organizations" 
  ON organizations 
  FOR SELECT 
  USING (public.user_has_organization_access(auth.uid(), id));

CREATE POLICY "Organization admins can update organizations" 
  ON organizations 
  FOR UPDATE 
  USING (public.user_is_organization_admin(auth.uid(), id));

-- Organization members policies (simplified to avoid recursion)
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
