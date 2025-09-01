
-- Step 1: Fix all security definer functions to have immutable search paths
-- This addresses the security warnings and prevents infinite recursion

-- Drop existing functions that have mutable search paths
DROP FUNCTION IF EXISTS public.get_user_organization_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_organization_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_organization_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_team_ids(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_team_equipment_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_work_order_access(uuid, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_team_role(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_team_access(uuid, uuid) CASCADE;

-- Step 2: Drop ALL existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view org members of their orgs" ON organization_members;
DROP POLICY IF EXISTS "Org admins can manage members" ON organization_members;
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

-- Step 3: Create NEW security definer functions with proper immutable search paths
CREATE OR REPLACE FUNCTION public.get_user_org_role_secure(user_uuid uuid, org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT role
  FROM public.organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_org_access_secure(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_org_admin_secure(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_team_access_secure(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.check_team_role_secure(user_uuid uuid, team_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
      AND tm.role::text = required_role
  );
$$;

-- Step 4: Create simple, non-recursive RLS policies using only the secure functions

-- Profiles policies (no dependencies)
CREATE POLICY "profiles_select_all" 
  ON profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "profiles_update_own" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

-- Organizations policies
CREATE POLICY "orgs_select_members" 
  ON organizations 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), id));

CREATE POLICY "orgs_update_admins" 
  ON organizations 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), id));

-- Organization members policies
CREATE POLICY "org_members_select_same_org" 
  ON organization_members 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "org_members_manage_admins" 
  ON organization_members 
  FOR ALL 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- Teams policies
CREATE POLICY "teams_select_org_members" 
  ON teams 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "teams_manage_admins" 
  ON teams 
  FOR ALL 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- Team members policies
CREATE POLICY "team_members_select_org_access" 
  ON team_members 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM public.teams WHERE id = team_id
    ))
  );

CREATE POLICY "team_members_manage_org_admins" 
  ON team_members 
  FOR ALL 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM public.teams WHERE id = team_id
    ))
  );

-- Equipment policies
CREATE POLICY "equipment_select_org_members" 
  ON equipment 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "equipment_manage_org_admins" 
  ON equipment 
  FOR ALL 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- Work orders policies
CREATE POLICY "work_orders_select_org_members" 
  ON work_orders 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "work_orders_insert_org_members" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    public.check_org_access_secure(auth.uid(), organization_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "work_orders_update_org_admins" 
  ON work_orders 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "work_orders_delete_org_admins" 
  ON work_orders 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- Scans policies
CREATE POLICY "scans_select_equipment_org" 
  ON scans 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM public.equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "scans_insert_equipment_org" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() AND
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM public.equipment WHERE id = equipment_id
    ))
  );

-- Notes policies
CREATE POLICY "notes_select_equipment_org" 
  ON notes 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM public.equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "notes_insert_equipment_org" 
  ON notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() AND
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM public.equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "notes_update_own" 
  ON notes 
  FOR UPDATE 
  USING (author_id = auth.uid());
