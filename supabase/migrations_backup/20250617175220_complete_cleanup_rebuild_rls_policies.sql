
-- Complete cleanup and rebuild of RLS policies to fix infinite recursion
-- Drop ALL existing policies on both tables first
DROP POLICY IF EXISTS "org_members_own_records_only" ON organization_members;
DROP POLICY IF EXISTS "Users can view org members of their orgs" ON organization_members;
DROP POLICY IF EXISTS "Org admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_select_own" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_insert_own" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_update_own" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_delete_own" ON organization_members;
DROP POLICY IF EXISTS "final_orgs_select_members" ON organizations;
DROP POLICY IF EXISTS "orgs_members_can_view" ON organizations;

-- Create the simple, non-recursive policy for organization_members
-- This allows users to manage only their own membership records
CREATE POLICY "org_members_own_records_only" 
  ON organization_members 
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Create the organizations policy using the secure function
-- This will work because organization_members now has non-recursive policies
CREATE POLICY "orgs_members_can_view" 
  ON organizations 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), id));

-- Ensure RLS is enabled on both tables
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
