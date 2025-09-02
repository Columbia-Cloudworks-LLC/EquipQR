-- RLS Policy Simplification Plan Implementation
-- This migration consolidates security functions and standardizes policy patterns

-- Step 1: Create consolidated security functions to replace multiple similar functions
CREATE OR REPLACE FUNCTION public.is_org_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- Step 2: Simplify organization_members policies (remove duplicates and consolidate)
DROP POLICY IF EXISTS "org_members_minimal_delete" ON organization_members;
DROP POLICY IF EXISTS "org_members_minimal_insert" ON organization_members;
DROP POLICY IF EXISTS "org_members_minimal_update" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select_safe" ON organization_members;

CREATE POLICY "members_own_record" ON organization_members
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_manage_members" ON organization_members
FOR ALL  
USING (is_org_admin(auth.uid(), organization_id))
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Step 3: Simplify organization_invitations policies
DROP POLICY IF EXISTS "invitation_minimal_delete" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_minimal_insert" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_minimal_select" ON organization_invitations;
DROP POLICY IF EXISTS "invitation_minimal_update" ON organization_invitations;

CREATE POLICY "admins_manage_invitations" ON organization_invitations
FOR ALL
USING (is_org_admin(auth.uid(), organization_id))
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Step 4: Standardize equipment policies
DROP POLICY IF EXISTS "equipment_insert_optimized" ON equipment;
DROP POLICY IF EXISTS "equipment_select_optimized" ON equipment;
DROP POLICY IF EXISTS "equipment_update_optimized" ON equipment;

CREATE POLICY "members_view_equipment" ON equipment
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "members_create_equipment" ON equipment
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "admins_manage_equipment" ON equipment
FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

-- Step 5: Standardize work_orders policies
DROP POLICY IF EXISTS "work_orders_delete_optimized" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_optimized" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select_optimized" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_optimized" ON work_orders;

CREATE POLICY "members_access_work_orders" ON work_orders
FOR ALL
USING (is_org_member(auth.uid(), organization_id))
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "admins_delete_work_orders" ON work_orders
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Step 6: Standardize teams policies
DROP POLICY IF EXISTS "teams_insert_optimized" ON teams;
DROP POLICY IF EXISTS "teams_select_optimized" ON teams;
DROP POLICY IF EXISTS "teams_update_optimized" ON teams;

CREATE POLICY "members_view_teams" ON teams
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "admins_manage_teams" ON teams
FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "admins_update_teams" ON teams
FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

-- Step 7: Standardize team_members policies
DROP POLICY IF EXISTS "team_members_insert_optimized" ON team_members;
DROP POLICY IF EXISTS "team_members_select_optimized" ON team_members;
DROP POLICY IF EXISTS "team_members_update_optimized" ON team_members;

CREATE POLICY "members_view_team_members" ON team_members
FOR SELECT
USING (is_org_member(auth.uid(), (SELECT organization_id FROM teams WHERE id = team_id)));

CREATE POLICY "admins_manage_team_members" ON team_members
FOR ALL
USING (is_org_admin(auth.uid(), (SELECT organization_id FROM teams WHERE id = team_id)))
WITH CHECK (is_org_admin(auth.uid(), (SELECT organization_id FROM teams WHERE id = team_id)));

-- Step 8: Standardize work_order_costs policies
DROP POLICY IF EXISTS "work_order_costs_delete_optimized" ON work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_insert_optimized" ON work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_select_optimized" ON work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_update_optimized" ON work_order_costs;

CREATE POLICY "members_view_costs" ON work_order_costs
FOR SELECT
USING (is_org_member(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));

CREATE POLICY "users_manage_own_costs" ON work_order_costs
FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "admins_manage_all_costs" ON work_order_costs
FOR ALL
USING (is_org_admin(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)))
WITH CHECK (is_org_admin(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));

-- Step 9: Standardize equipment_notes policies
DROP POLICY IF EXISTS "equipment_notes_delete_optimized" ON equipment_notes;
DROP POLICY IF EXISTS "equipment_notes_insert_optimized" ON equipment_notes;
DROP POLICY IF EXISTS "equipment_notes_select_optimized" ON equipment_notes;
DROP POLICY IF EXISTS "equipment_notes_update_optimized" ON equipment_notes;

CREATE POLICY "members_view_notes" ON equipment_notes
FOR SELECT
USING (
  is_org_member(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id))
  AND (NOT is_private OR author_id = auth.uid())
);

CREATE POLICY "members_create_notes" ON equipment_notes
FOR INSERT
WITH CHECK (
  author_id = auth.uid() 
  AND is_org_member(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id))
);

CREATE POLICY "authors_manage_own_notes" ON equipment_notes
FOR ALL
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Step 10: Grant permissions for new consolidated functions
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;

-- Step 11: Clean up old unused functions (keep only the ones still needed)
-- Note: We're keeping the atomic functions as they're used for invitation management
-- and the specific secure functions that may be referenced elsewhere

COMMENT ON FUNCTION public.is_org_member IS 'Consolidated function to check organization membership - replaces multiple similar functions';
COMMENT ON FUNCTION public.is_org_admin IS 'Consolidated function to check organization admin status - replaces multiple similar functions';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: RLS policies have been simplified and standardized.';
  RAISE NOTICE 'Consolidated security functions created: is_org_member, is_org_admin';
  RAISE NOTICE 'Removed duplicate policies and standardized patterns across all tables.';
  RAISE NOTICE 'All functionality preserved while reducing complexity.';
END $$;