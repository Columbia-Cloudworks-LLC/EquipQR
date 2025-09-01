
-- FINAL SOLUTION: Fix infinite recursion by creating clean, non-recursive policies
-- This completely eliminates the circular dependency between organizations and organization_members

-- Step 1: Drop ALL existing policies on organization_members to start fresh
DROP POLICY IF EXISTS "Users can view org members of their orgs" ON organization_members;
DROP POLICY IF EXISTS "Org admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_select_own" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_insert_own" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_update_own" ON organization_members;
DROP POLICY IF EXISTS "final_org_members_delete_own" ON organization_members;

-- Step 2: Create ONE simple, non-recursive policy for organization_members
-- This allows users to manage only their own membership records
CREATE POLICY "org_members_own_records_only" 
  ON organization_members 
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Step 3: Update organizations policy to use the secure function
-- This will now work because organization_members has non-recursive policies
DROP POLICY IF EXISTS "final_orgs_select_members" ON organizations;

CREATE POLICY "orgs_members_can_view" 
  ON organizations 
  FOR SELECT 
  USING (public.check_org_access_secure(auth.uid(), id));

-- Step 4: Verify RLS is enabled on both tables
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
