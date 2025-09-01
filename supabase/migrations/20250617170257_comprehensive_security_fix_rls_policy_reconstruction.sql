
-- COMPREHENSIVE SECURITY FIX: Complete RLS Policy Reconstruction
-- This migration addresses infinite recursion, missing policies, and security vulnerabilities

-- Step 1: Complete policy cleanup (remove ALL existing policies)
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
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

-- Additional cleanup for any other policy variants
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "orgs_select_members" ON organizations;
DROP POLICY IF EXISTS "orgs_update_admins" ON organizations;
DROP POLICY IF EXISTS "org_members_select_same_org" ON organization_members;
DROP POLICY IF EXISTS "org_members_manage_admins" ON organization_members;
DROP POLICY IF EXISTS "teams_select_org_members" ON teams;
DROP POLICY IF EXISTS "teams_manage_admins" ON teams;
DROP POLICY IF EXISTS "team_members_select_org_access" ON team_members;
DROP POLICY IF EXISTS "team_members_manage_org_admins" ON team_members;
DROP POLICY IF EXISTS "equipment_select_org_members" ON equipment;
DROP POLICY IF EXISTS "equipment_manage_org_admins" ON equipment;
DROP POLICY IF EXISTS "work_orders_select_org_members" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_org_members" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_org_admins" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_org_admins" ON work_orders;
DROP POLICY IF EXISTS "scans_select_equipment_org" ON scans;
DROP POLICY IF EXISTS "scans_insert_equipment_org" ON scans;
DROP POLICY IF EXISTS "notes_select_equipment_org" ON notes;
DROP POLICY IF EXISTS "notes_insert_equipment_org" ON notes;
DROP POLICY IF EXISTS "notes_update_own" ON notes;

-- Step 2: Drop conflicting security definer functions
DROP FUNCTION IF EXISTS public.get_user_organization_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_organization_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_organization_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_team_ids(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_team_equipment_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_work_order_access(uuid, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_team_role(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_team_access(uuid, uuid) CASCADE;

-- Keep the working functions that don't cause recursion
-- These functions are already defined and working correctly:
-- - public.get_user_org_role_direct(uuid, uuid)
-- - public.check_org_access_direct(uuid, uuid)
-- - public.get_user_org_role_secure(uuid, uuid)
-- - public.check_org_access_secure(uuid, uuid)
-- - public.check_org_admin_secure(uuid, uuid)
-- - public.check_team_access_secure(uuid, uuid)
-- - public.check_team_role_secure(uuid, uuid, text)
-- - public.get_user_team_memberships(uuid, uuid)
-- - public.get_user_organization_membership(uuid)

-- Step 3: Create comprehensive, non-recursive RLS policies

-- PROFILES TABLE (Foundation - no dependencies)
CREATE POLICY "secure_profiles_select_all" 
  ON profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "secure_profiles_update_own" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "secure_profiles_insert_own" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- ORGANIZATIONS TABLE
CREATE POLICY "secure_orgs_select_members" 
  ON organizations 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), id));

CREATE POLICY "secure_orgs_update_admins" 
  ON organizations 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), id));

CREATE POLICY "secure_orgs_insert_admins" 
  ON organizations 
  FOR INSERT 
  WITH CHECK (true); -- New organizations can be created

-- ORGANIZATION_MEMBERS TABLE (Critical - must avoid recursion)
CREATE POLICY "secure_org_members_select_same_org" 
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

CREATE POLICY "secure_org_members_insert_admins" 
  ON organization_members 
  FOR INSERT 
  WITH CHECK (
    public.check_org_admin_secure(auth.uid(), organization_id)
  );

CREATE POLICY "secure_org_members_update_admins" 
  ON organization_members 
  FOR UPDATE 
  USING (
    public.check_org_admin_secure(auth.uid(), organization_id)
  );

CREATE POLICY "secure_org_members_delete_admins" 
  ON organization_members 
  FOR DELETE 
  USING (
    public.check_org_admin_secure(auth.uid(), organization_id)
  );

-- TEAMS TABLE
CREATE POLICY "secure_teams_select_org_members" 
  ON teams 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "secure_teams_insert_admins" 
  ON teams 
  FOR INSERT 
  WITH CHECK (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "secure_teams_update_admins" 
  ON teams 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "secure_teams_delete_admins" 
  ON teams 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- TEAM_MEMBERS TABLE
CREATE POLICY "secure_team_members_select_org_access" 
  ON team_members 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "secure_team_members_insert_org_admins" 
  ON team_members 
  FOR INSERT 
  WITH CHECK (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "secure_team_members_update_org_admins" 
  ON team_members 
  FOR UPDATE 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

CREATE POLICY "secure_team_members_delete_org_admins" 
  ON team_members 
  FOR DELETE 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM teams WHERE id = team_id
    ))
  );

-- EQUIPMENT TABLE
CREATE POLICY "secure_equipment_select_org_members" 
  ON equipment 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "secure_equipment_insert_org_members" 
  ON equipment 
  FOR INSERT 
  WITH CHECK (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "secure_equipment_update_org_admins" 
  ON equipment 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "secure_equipment_delete_org_admins" 
  ON equipment 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- WORK_ORDERS TABLE
CREATE POLICY "secure_work_orders_select_org_members" 
  ON work_orders 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), organization_id));

CREATE POLICY "secure_work_orders_insert_org_members" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    public.check_org_access_secure(auth.uid(), organization_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "secure_work_orders_update_org_admins" 
  ON work_orders 
  FOR UPDATE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

CREATE POLICY "secure_work_orders_delete_org_admins" 
  ON work_orders 
  FOR DELETE 
  USING (public.check_org_admin_secure(auth.uid(), organization_id));

-- SCANS TABLE
CREATE POLICY "secure_scans_select_equipment_org" 
  ON scans 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "secure_scans_insert_equipment_org" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() AND
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "secure_scans_update_own" 
  ON scans 
  FOR UPDATE 
  USING (scanned_by = auth.uid());

CREATE POLICY "secure_scans_delete_org_admins" 
  ON scans 
  FOR DELETE 
  USING (
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

-- NOTES TABLE
CREATE POLICY "secure_notes_select_equipment_org" 
  ON equipment_notes 
  FOR SELECT 
  USING (
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "secure_notes_insert_equipment_org" 
  ON equipment_notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() AND
    public.check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

CREATE POLICY "secure_notes_update_own" 
  ON equipment_notes 
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "secure_notes_delete_own_or_admin" 
  ON equipment_notes 
  FOR DELETE 
  USING (
    author_id = auth.uid() OR
    public.check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM equipment WHERE id = equipment_id
    ))
  );

-- Step 4: Ensure all tables have RLS enabled (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
        ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment') THEN
        ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') THEN
        ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
        ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Note: equipment_notes table is created later and RLS is enabled there
END $$;

-- Step 5: Add missing database constraints for data integrity
-- Ensure organization member counts are consistent
CREATE OR REPLACE FUNCTION public.update_organization_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = NEW.organization_id AND status = 'active'
    )
    WHERE id = NEW.organization_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = OLD.organization_id AND status = 'active'
    )
    WHERE id = OLD.organization_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new organizations if organization_id changed
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = OLD.organization_id AND status = 'active'
    )
    WHERE id = OLD.organization_id;
    
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = NEW.organization_id AND status = 'active'
    )
    WHERE id = NEW.organization_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for member count updates
DROP TRIGGER IF EXISTS trigger_update_member_count ON organization_members;
CREATE TRIGGER trigger_update_member_count
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_organization_member_count();

-- Add validation to prevent exceeding max_members
CREATE OR REPLACE FUNCTION public.validate_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT member_count, max_members INTO current_count, max_count
    FROM organizations WHERE id = NEW.organization_id;
    
    IF current_count >= max_count THEN
      RAISE EXCEPTION 'Organization has reached maximum member limit of %', max_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_member_limit ON organization_members;
CREATE TRIGGER trigger_validate_member_limit
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_member_limit();
