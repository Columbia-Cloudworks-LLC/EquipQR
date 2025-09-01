
-- FINAL FIX: Complete RLS Policy Reconstruction to Eliminate Infinite Recursion
-- This migration removes ALL conflicting policies and creates a clean, minimal set

-- Step 1: Drop ALL existing policies that could cause conflicts
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view org members of their orgs" ON organization_members;
DROP POLICY IF EXISTS "Org admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "secure_org_members_select_same_org" ON organization_members;
DROP POLICY IF EXISTS "secure_org_members_insert_admins" ON organization_members;
DROP POLICY IF EXISTS "secure_org_members_update_admins" ON organization_members;
DROP POLICY IF EXISTS "secure_org_members_delete_admins" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization teams" ON teams;
DROP POLICY IF EXISTS "Organization admins can manage teams" ON teams;
DROP POLICY IF EXISTS "secure_teams_select_org_members" ON teams;
DROP POLICY IF EXISTS "secure_teams_insert_admins" ON teams;
DROP POLICY IF EXISTS "secure_teams_update_admins" ON teams;
DROP POLICY IF EXISTS "secure_teams_delete_admins" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Organization admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "secure_team_members_select_org_access" ON team_members;
DROP POLICY IF EXISTS "secure_team_members_insert_org_admins" ON team_members;
DROP POLICY IF EXISTS "secure_team_members_update_org_admins" ON team_members;
DROP POLICY IF EXISTS "secure_team_members_delete_org_admins" ON team_members;
DROP POLICY IF EXISTS "Users can view organization equipment" ON equipment;
DROP POLICY IF EXISTS "Organization admins can manage equipment" ON equipment;
DROP POLICY IF EXISTS "secure_equipment_select_org_members" ON equipment;
DROP POLICY IF EXISTS "secure_equipment_insert_org_members" ON equipment;
DROP POLICY IF EXISTS "secure_equipment_update_org_admins" ON equipment;
DROP POLICY IF EXISTS "secure_equipment_delete_org_admins" ON equipment;
DROP POLICY IF EXISTS "Users can view organization work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can manage work orders" ON work_orders;
DROP POLICY IF EXISTS "secure_work_orders_select_org_members" ON work_orders;
DROP POLICY IF EXISTS "secure_work_orders_insert_org_members" ON work_orders;
DROP POLICY IF EXISTS "secure_work_orders_update_org_admins" ON work_orders;
DROP POLICY IF EXISTS "secure_work_orders_delete_org_admins" ON work_orders;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "secure_profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "secure_profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "secure_profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "Users can view organization scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans" ON scans;
DROP POLICY IF EXISTS "secure_scans_select_equipment_org" ON scans;
DROP POLICY IF EXISTS "secure_scans_insert_equipment_org" ON scans;
DROP POLICY IF EXISTS "secure_scans_update_own" ON scans;
DROP POLICY IF EXISTS "secure_scans_delete_org_admins" ON scans;
DROP POLICY IF EXISTS "Users can view organization notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes" ON notes;
DROP POLICY IF EXISTS "Authors can update own notes" ON notes;
DROP POLICY IF EXISTS "secure_notes_select_equipment_org" ON notes;
DROP POLICY IF EXISTS "secure_notes_insert_equipment_org" ON notes;
DROP POLICY IF EXISTS "secure_notes_update_own" ON notes;
DROP POLICY IF EXISTS "secure_notes_delete_own_or_admin" ON notes;

-- Step 2: Create MINIMAL, NON-RECURSIVE policies using only safe functions

-- PROFILES TABLE (Foundation - no dependencies)
CREATE POLICY "final_profiles_select_all" 
  ON profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "final_profiles_update_own" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "final_profiles_insert_own" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- ORGANIZATION_MEMBERS TABLE (Critical - MUST avoid recursion)
-- Use ONLY direct auth.uid() checks - NO function calls that might reference this table
CREATE POLICY "final_org_members_select_own" 
  ON organization_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "final_org_members_insert_own" 
  ON organization_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "final_org_members_update_own" 
  ON organization_members 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "final_org_members_delete_own" 
  ON organization_members 
  FOR DELETE 
  USING (user_id = auth.uid());

-- ORGANIZATIONS TABLE (Safe to use secure functions now)
CREATE POLICY "final_orgs_select_members" 
  ON organizations 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), id));

CREATE POLICY "final_orgs_update_admins" 
  ON organizations 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), id));

CREATE POLICY "final_orgs_insert_anyone" 
  ON organizations 
  FOR INSERT 
  WITH CHECK (true);

-- TEAMS TABLE
CREATE POLICY "final_teams_select_org_members" 
  ON teams 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "final_teams_insert_admins" 
  ON teams 
  FOR INSERT 
  WITH CHECK (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "final_teams_update_admins" 
  ON teams 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "final_teams_delete_admins" 
  ON teams 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- TEAM_MEMBERS TABLE
CREATE POLICY "final_team_members_select_org_access" 
  ON team_members 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "final_team_members_insert_admins" 
  ON team_members 
  FOR INSERT 
  WITH CHECK (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "final_team_members_update_admins" 
  ON team_members 
  FOR UPDATE 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "final_team_members_delete_admins" 
  ON team_members 
  FOR DELETE 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

-- EQUIPMENT TABLE
CREATE POLICY "final_equipment_select_org_members" 
  ON equipment 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "final_equipment_insert_members" 
  ON equipment 
  FOR INSERT 
  WITH CHECK (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "final_equipment_update_admins" 
  ON equipment 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "final_equipment_delete_admins" 
  ON equipment 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- WORK_ORDERS TABLE
CREATE POLICY "final_work_orders_select_org_members" 
  ON work_orders 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "final_work_orders_insert_members" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    public.check_org_access_secure(auth.uid(), organization_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "final_work_orders_update_admins" 
  ON work_orders 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "final_work_orders_delete_admins" 
  ON work_orders 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- SCANS TABLE
CREATE POLICY "final_scans_select_equipment_org" 
  ON scans 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "final_scans_insert_equipment_org" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() AND
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "final_scans_update_own" 
  ON scans 
  FOR UPDATE 
  USING (scanned_by = auth.uid());

CREATE POLICY "final_scans_delete_admins" 
  ON scans 
  FOR DELETE 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

-- NOTES TABLE
CREATE POLICY "final_notes_select_equipment_org" 
  ON notes 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "final_notes_insert_equipment_org" 
  ON notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() AND
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "final_notes_update_own" 
  ON notes 
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "final_notes_delete_own_or_admin" 
  ON notes 
  FOR DELETE 
  USING (
    author_id = auth.uid() OR
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

-- Step 3: Ensure all tables have RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
