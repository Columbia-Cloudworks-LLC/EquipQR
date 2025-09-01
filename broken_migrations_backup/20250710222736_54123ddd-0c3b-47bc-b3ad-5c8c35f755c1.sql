-- Fix organization_members RLS policies to allow proper member visibility
-- Drop the overly restrictive current policy
DROP POLICY IF EXISTS "members_own_record" ON organization_members;

-- Create new policies for proper access control

-- 1. Allow users to view members in organizations they belong to
CREATE POLICY "members_view_org_members" 
  ON organization_members 
  FOR SELECT 
  USING (
    -- Users can see members in organizations where they are also members
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- 2. Allow users to manage their own membership records
CREATE POLICY "members_manage_own_record" 
  ON organization_members 
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 3. Allow admins to manage memberships within their organizations
CREATE POLICY "admins_manage_org_members" 
  ON organization_members 
  FOR ALL 
  USING (
    is_org_admin(auth.uid(), organization_id)
  ) 
  WITH CHECK (
    is_org_admin(auth.uid(), organization_id)
  );

-- 4. Allow insertion of new members by admins or during invitation acceptance
CREATE POLICY "allow_member_insertion" 
  ON organization_members 
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is admin of the organization
    is_org_admin(auth.uid(), organization_id)
    OR 
    -- Allow if user is adding themselves (invitation acceptance)
    user_id = auth.uid()
  );

-- Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;