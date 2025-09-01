
-- Step 1: Drop ALL policies that might exist (comprehensive list)
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
DROP POLICY IF EXISTS "Organization admins can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can delete work orders" ON work_orders;
DROP POLICY IF EXISTS "Assigned users can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans" ON scans;
DROP POLICY IF EXISTS "Users can view organization notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes" ON notes;
DROP POLICY IF EXISTS "Authors can update own notes" ON notes;

-- Additional policies that might exist (from the error message)
DROP POLICY IF EXISTS "Users can view organization members if they have access" ON organization_members;
DROP POLICY IF EXISTS "Users can view team members in their organization" ON team_members;
DROP POLICY IF EXISTS "Users can create work orders in their organization" ON work_orders;
DROP POLICY IF EXISTS "Users can view scans for equipment in their organization" ON scans;
DROP POLICY IF EXISTS "Users can create scans for equipment in their organization" ON scans;
DROP POLICY IF EXISTS "Users can view notes for equipment in their organization" ON notes;
DROP POLICY IF EXISTS "Users can create notes for equipment in their organization" ON notes;

-- Drop any other potential policies
DROP POLICY IF EXISTS "Users can view team equipment" ON equipment;
DROP POLICY IF EXISTS "Organization admins can manage all equipment" ON equipment;
DROP POLICY IF EXISTS "Team managers can manage their team equipment" ON equipment;
DROP POLICY IF EXISTS "Team technicians can update their team equipment status" ON equipment;
DROP POLICY IF EXISTS "Users can view relevant work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can manage all work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can update relevant work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can view team equipment scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans for accessible equipment" ON scans;
DROP POLICY IF EXISTS "Users can view team equipment notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes for accessible equipment" ON notes;

-- Step 2: Now drop the functions using CASCADE to force removal of any remaining dependencies
DROP FUNCTION IF EXISTS public.get_user_organization_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_organization_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_organization_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_team_ids(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_team_equipment_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_work_order_access(uuid, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_team_role(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_team_access(uuid, uuid) CASCADE;

-- Step 3: Create simple, non-recursive security functions
CREATE OR REPLACE FUNCTION public.get_user_org_role_direct(user_uuid uuid, org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_org_access_direct(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;

-- Step 4: Create minimal RLS policies starting with the most basic ones

-- Profiles policies (no dependencies)
CREATE POLICY "Users can view all profiles" 
  ON profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

-- Organizations policies (depends on organization_members but NOT vice versa)
CREATE POLICY "Users can view their organizations" 
  ON organizations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = id 
        AND om.user_id = auth.uid() 
        AND om.status = 'active'
    )
  );

CREATE POLICY "Organization admins can update organizations" 
  ON organizations 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Organization members policies (ULTRA SIMPLE - no function calls)
CREATE POLICY "Users can view org members of their orgs" 
  ON organization_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om2 
      WHERE om2.organization_id = organization_id 
        AND om2.user_id = auth.uid() 
        AND om2.status = 'active'
    )
  );

CREATE POLICY "Org admins can manage members" 
  ON organization_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om2 
      WHERE om2.organization_id = organization_id 
        AND om2.user_id = auth.uid() 
        AND om2.role IN ('owner', 'admin')
        AND om2.status = 'active'
    )
  );

-- Teams policies (using the safe functions)
CREATE POLICY "Users can view organization teams" 
  ON teams 
  FOR SELECT 
  USING (public.check_org_access_direct(auth.uid(), organization_id));

CREATE POLICY "Organization admins can manage teams" 
  ON teams 
  FOR ALL 
  USING (
    public.get_user_org_role_direct(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Equipment policies (basic)
CREATE POLICY "Users can view organization equipment" 
  ON equipment 
  FOR SELECT 
  USING (public.check_org_access_direct(auth.uid(), organization_id));

CREATE POLICY "Organization admins can manage equipment" 
  ON equipment 
  FOR ALL 
  USING (
    public.get_user_org_role_direct(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Work orders policies (basic)
CREATE POLICY "Users can view organization work orders" 
  ON work_orders 
  FOR SELECT 
  USING (public.check_org_access_direct(auth.uid(), organization_id));

CREATE POLICY "Users can create work orders" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    public.check_org_access_direct(auth.uid(), organization_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Organization admins can manage work orders" 
  ON work_orders 
  FOR UPDATE 
  USING (
    public.get_user_org_role_direct(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Team members policies (basic)
CREATE POLICY "Users can view team members" 
  ON team_members 
  FOR SELECT 
  USING (
    public.check_org_access_direct(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "Organization admins can manage team members" 
  ON team_members 
  FOR ALL 
  USING (
    public.get_user_org_role_direct(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    )) IN ('owner', 'admin')
  );

-- Scans policies (basic)
CREATE POLICY "Users can view organization scans" 
  ON scans 
  FOR SELECT 
  USING (
    public.check_org_access_direct(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "Users can create scans" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() AND
    public.check_org_access_direct(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

-- Notes policies (basic)
CREATE POLICY "Users can view organization notes" 
  ON notes 
  FOR SELECT 
  USING (
    public.check_org_access_direct(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "Users can create notes" 
  ON notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() AND
    public.check_org_access_direct(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "Authors can update own notes" 
  ON notes 
  FOR UPDATE 
  USING (author_id = auth.uid());
