-- Clean up duplicate RLS policies that cause circular dependencies
-- This fixes the "stack depth limit exceeded" error when creating invitations

-- Step 1: Drop all duplicate "final_" policies (keeping the optimized ones)

-- Profiles table - remove final_ policies (keep optimized)
DROP POLICY IF EXISTS "final_profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "final_profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "final_profiles_update_own" ON profiles;

-- Organization members table - remove both sets and create clean ones
DROP POLICY IF EXISTS "org_members_delete_optimized" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_own" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_optimized" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_own" ON organization_members;
DROP POLICY IF EXISTS "org_members_select_optimized" ON organization_members;
DROP POLICY IF EXISTS "org_members_select_own" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_optimized" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_own" ON organization_members;

-- Equipment table - remove final_ policies (keep optimized)
DROP POLICY IF EXISTS "final_equipment_delete_admins" ON equipment;
DROP POLICY IF EXISTS "final_equipment_insert_members" ON equipment;
DROP POLICY IF EXISTS "final_equipment_select_org_members" ON equipment;
DROP POLICY IF EXISTS "final_equipment_update_admins" ON equipment;

-- Teams table - remove final_ policies (keep optimized)
DROP POLICY IF EXISTS "final_teams_delete_admins" ON teams;
DROP POLICY IF EXISTS "final_teams_insert_admins" ON teams;
DROP POLICY IF EXISTS "final_teams_select_org_members" ON teams;
DROP POLICY IF EXISTS "final_teams_update_admins" ON teams;

-- Team members table - remove final_ policies (keep optimized)
DROP POLICY IF EXISTS "final_team_members_delete_admins" ON team_members;
DROP POLICY IF EXISTS "final_team_members_insert_admins" ON team_members;
DROP POLICY IF EXISTS "final_team_members_select_org_access" ON team_members;
DROP POLICY IF EXISTS "final_team_members_update_admins" ON team_members;

-- Work orders table - remove final_ and duplicate policies
DROP POLICY IF EXISTS "final_work_orders_delete_admins" ON work_orders;
DROP POLICY IF EXISTS "final_work_orders_insert_members" ON work_orders;
DROP POLICY IF EXISTS "final_work_orders_select_org_members" ON work_orders;
DROP POLICY IF EXISTS "final_work_orders_update_admins" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_admins" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_organization_members" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select_organization_members" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_organization_members" ON work_orders;

-- Step 2: Create clean, non-conflicting policies for organization_members
-- This is the critical table that needs simple, non-recursive policies

CREATE POLICY "organization_members_select_own" 
  ON organization_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "organization_members_insert_own" 
  ON organization_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "organization_members_update_own" 
  ON organization_members 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "organization_members_delete_own" 
  ON organization_members 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Step 3: Ensure all remaining policies use consistent security definer functions
-- No changes needed for other tables as they use the optimized policies with security definer functions

-- Comment for reference
COMMENT ON TABLE organization_members IS 'RLS policies cleaned up to prevent circular dependencies - users can only access their own membership records';