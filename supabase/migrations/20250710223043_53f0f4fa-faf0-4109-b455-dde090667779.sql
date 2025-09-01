-- Fix infinite recursion in organization_members RLS policies
-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "members_view_org_members" ON organization_members;
DROP POLICY IF EXISTS "members_manage_own_record" ON organization_members;
DROP POLICY IF EXISTS "admins_manage_org_members" ON organization_members;
DROP POLICY IF EXISTS "allow_member_insertion" ON organization_members;

-- Create new non-recursive policies using security definer functions

-- 1. Allow users to view members in organizations they belong to
CREATE POLICY "members_view_org_members_fixed" 
  ON organization_members 
  FOR SELECT 
  USING (
    -- Use security definer function to prevent recursion
    is_org_member(auth.uid(), organization_id)
  );

-- 2. Allow users to manage their own membership records
CREATE POLICY "members_manage_own_record_fixed" 
  ON organization_members 
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 3. Allow admins to manage memberships within their organizations
CREATE POLICY "admins_manage_org_members_fixed" 
  ON organization_members 
  FOR ALL 
  USING (
    -- Use security definer function to prevent recursion
    is_org_admin(auth.uid(), organization_id)
  ) 
  WITH CHECK (
    -- Use security definer function to prevent recursion
    is_org_admin(auth.uid(), organization_id)
  );

-- 4. Allow insertion of new members by admins or during invitation acceptance
CREATE POLICY "allow_member_insertion_fixed" 
  ON organization_members 
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is admin of the organization OR adding themselves
    is_org_admin(auth.uid(), organization_id) OR user_id = auth.uid()
  );

-- Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;