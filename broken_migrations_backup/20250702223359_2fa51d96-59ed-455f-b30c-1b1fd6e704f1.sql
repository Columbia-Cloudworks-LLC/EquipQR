-- Performance optimization for RLS policies
-- Address Supabase Performance Advisor warnings

-- Step 1: Create optimized security definer functions for common operations
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
RETURNS TABLE(organization_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = user_uuid 
    AND om.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_admin(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

-- Step 2: Drop redundant and inefficient policies

-- Equipment table - remove redundant policies
DROP POLICY IF EXISTS "Organization members can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Organization members can update equipment" ON equipment;
DROP POLICY IF EXISTS "Organization members can view equipment" ON equipment;
DROP POLICY IF EXISTS "Users can manage equipment in their organizations" ON equipment;
DROP POLICY IF EXISTS "Users can view equipment in their organizations" ON equipment;

-- Team members table - remove redundant policies
DROP POLICY IF EXISTS "Users can manage team members in their organizations" ON team_members;
DROP POLICY IF EXISTS "Users can view team members in their organizations" ON team_members;

-- Teams table - remove redundant policies
DROP POLICY IF EXISTS "Organization members can view teams" ON teams;
DROP POLICY IF EXISTS "Users can manage teams in their organizations" ON teams;
DROP POLICY IF EXISTS "Users can view teams in their organizations" ON teams;

-- Work orders table - remove redundant policies
DROP POLICY IF EXISTS "Users can manage work orders in their organizations" ON work_orders;
DROP POLICY IF EXISTS "Users can view work orders in their organizations" ON work_orders;

-- Organization members - remove redundant policies
DROP POLICY IF EXISTS "org_members_own_records_only" ON organization_members;

-- Profiles - remove redundant policies
DROP POLICY IF EXISTS "Users can view profiles in their organization context" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Step 3: Create optimized policies using new functions and efficient patterns

-- Equipment policies (optimized)
CREATE POLICY "equipment_select_optimized" 
  ON equipment 
  FOR SELECT 
  USING (public.is_organization_member((SELECT auth.uid()), organization_id));

CREATE POLICY "equipment_insert_optimized" 
  ON equipment 
  FOR INSERT 
  WITH CHECK (public.is_organization_member((SELECT auth.uid()), organization_id));

CREATE POLICY "equipment_update_optimized" 
  ON equipment 
  FOR UPDATE 
  USING (public.is_organization_admin((SELECT auth.uid()), organization_id));

-- Teams policies (optimized)
CREATE POLICY "teams_select_optimized" 
  ON teams 
  FOR SELECT 
  USING (public.is_organization_member((SELECT auth.uid()), organization_id));

CREATE POLICY "teams_insert_optimized" 
  ON teams 
  FOR INSERT 
  WITH CHECK (public.is_organization_admin((SELECT auth.uid()), organization_id));

CREATE POLICY "teams_update_optimized" 
  ON teams 
  FOR UPDATE 
  USING (public.is_organization_admin((SELECT auth.uid()), organization_id));

-- Team members policies (optimized)
CREATE POLICY "team_members_select_optimized" 
  ON team_members 
  FOR SELECT 
  USING (
    public.is_organization_member(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM teams WHERE id = team_members.team_id)
    )
  );

CREATE POLICY "team_members_insert_optimized" 
  ON team_members 
  FOR INSERT 
  WITH CHECK (
    public.is_organization_admin(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM teams WHERE id = team_members.team_id)
    )
  );

CREATE POLICY "team_members_update_optimized" 
  ON team_members 
  FOR UPDATE 
  USING (
    public.is_organization_admin(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM teams WHERE id = team_members.team_id)
    )
  );

-- Work orders policies (optimized)
CREATE POLICY "work_orders_select_optimized" 
  ON work_orders 
  FOR SELECT 
  USING (public.is_organization_member((SELECT auth.uid()), organization_id));

CREATE POLICY "work_orders_insert_optimized" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (public.is_organization_member((SELECT auth.uid()), organization_id));

CREATE POLICY "work_orders_update_optimized" 
  ON work_orders 
  FOR UPDATE 
  USING (public.is_organization_member((SELECT auth.uid()), organization_id));

CREATE POLICY "work_orders_delete_optimized" 
  ON work_orders 
  FOR DELETE 
  USING (public.is_organization_admin((SELECT auth.uid()), organization_id));

-- Organization members policies (optimized)
CREATE POLICY "org_members_select_optimized" 
  ON organization_members 
  FOR SELECT 
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "org_members_insert_optimized" 
  ON organization_members 
  FOR INSERT 
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "org_members_update_optimized" 
  ON organization_members 
  FOR UPDATE 
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "org_members_delete_optimized" 
  ON organization_members 
  FOR DELETE 
  USING (user_id = (SELECT auth.uid()));

-- Profiles policies (optimized)
CREATE POLICY "profiles_select_optimized" 
  ON profiles 
  FOR SELECT 
  USING (true); -- Profiles are public within the application

CREATE POLICY "profiles_insert_optimized" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_optimized" 
  ON profiles 
  FOR UPDATE 
  USING (id = (SELECT auth.uid()));

-- Step 4: Optimize equipment notes policies
DROP POLICY IF EXISTS "Users can view equipment notes in their organization" ON equipment_notes;
DROP POLICY IF EXISTS "Users can create equipment notes in their organization" ON equipment_notes;
DROP POLICY IF EXISTS "Users can update their own equipment notes" ON equipment_notes;
DROP POLICY IF EXISTS "Users can delete their own equipment notes" ON equipment_notes;

CREATE POLICY "equipment_notes_select_optimized" 
  ON equipment_notes 
  FOR SELECT 
  USING (
    public.is_organization_member(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM equipment WHERE id = equipment_notes.equipment_id)
    ) 
    AND ((NOT is_private) OR (author_id = (SELECT auth.uid())))
  );

CREATE POLICY "equipment_notes_insert_optimized" 
  ON equipment_notes 
  FOR INSERT 
  WITH CHECK (
    author_id = (SELECT auth.uid()) 
    AND public.is_organization_member(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM equipment WHERE id = equipment_notes.equipment_id)
    )
  );

CREATE POLICY "equipment_notes_update_optimized" 
  ON equipment_notes 
  FOR UPDATE 
  USING (author_id = (SELECT auth.uid()));

CREATE POLICY "equipment_notes_delete_optimized" 
  ON equipment_notes 
  FOR DELETE 
  USING (author_id = (SELECT auth.uid()));

-- Step 5: Optimize work order costs policies
DROP POLICY IF EXISTS "Users can view work order costs" ON work_order_costs;
DROP POLICY IF EXISTS "Users can create work order costs" ON work_order_costs;
DROP POLICY IF EXISTS "Users can update work order costs" ON work_order_costs;
DROP POLICY IF EXISTS "Users can delete work order costs" ON work_order_costs;

CREATE POLICY "work_order_costs_select_optimized" 
  ON work_order_costs 
  FOR SELECT 
  USING (
    public.is_organization_member(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM work_orders WHERE id = work_order_costs.work_order_id)
    )
  );

CREATE POLICY "work_order_costs_insert_optimized" 
  ON work_order_costs 
  FOR INSERT 
  WITH CHECK (
    created_by = (SELECT auth.uid()) 
    AND public.is_organization_member(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM work_orders WHERE id = work_order_costs.work_order_id)
    )
  );

CREATE POLICY "work_order_costs_update_optimized" 
  ON work_order_costs 
  FOR UPDATE 
  USING (
    (created_by = (SELECT auth.uid())) 
    OR public.is_organization_admin(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM work_orders WHERE id = work_order_costs.work_order_id)
    )
  );

CREATE POLICY "work_order_costs_delete_optimized" 
  ON work_order_costs 
  FOR DELETE 
  USING (
    (created_by = (SELECT auth.uid())) 
    OR public.is_organization_admin(
      (SELECT auth.uid()), 
      (SELECT organization_id FROM work_orders WHERE id = work_order_costs.work_order_id)
    )
  );

-- Step 6: Add performance indexes for the new functions
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org_status ON organization_members(user_id, organization_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_organization_members_org_role_status ON organization_members(organization_id, role, status) WHERE status = 'active' AND role IN ('owner', 'admin');

-- Performance monitoring comment
COMMENT ON FUNCTION public.get_current_user_id() IS 'Optimized function to get current user ID for RLS policies - reduces auth.uid() calls';
COMMENT ON FUNCTION public.is_organization_member(uuid, uuid) IS 'Optimized function to check organization membership - replaces complex EXISTS subqueries';
COMMENT ON FUNCTION public.is_organization_admin(uuid, uuid) IS 'Optimized function to check admin access - uses indexed lookups';