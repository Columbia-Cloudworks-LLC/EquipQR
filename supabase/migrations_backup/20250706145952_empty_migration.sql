-- Fix infinite recursion in organization_members RLS policies
-- Drop the problematic context-aware SELECT policy that causes circular dependencies
DROP POLICY IF EXISTS "organization_members_context_aware_select" ON organization_members;

-- Create a simple, non-recursive SELECT policy that allows:
-- 1. Users to see their own membership records
-- 2. Admins to see other members in their organizations (using security definer function)
CREATE POLICY "organization_members_select_safe" 
  ON organization_members 
  FOR SELECT 
  USING (
    -- Allow users to see their own records
    user_id = auth.uid() 
    OR 
    -- Allow admins to see members in organizations where they are admin
    -- Using security definer function to avoid circular dependency
    public.check_admin_bypass_fixed(auth.uid(), organization_id)
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Fixed infinite recursion in organization_members RLS policies.';
  RAISE NOTICE 'The circular dependency has been eliminated using a security definer function.';
END $$;