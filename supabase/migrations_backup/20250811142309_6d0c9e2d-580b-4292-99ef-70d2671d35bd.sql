-- Fix profiles table security vulnerability by restricting public access
-- Currently the profiles_select_optimized policy allows unrestricted read access (USING true)
-- This exposes all user emails and names to potential attackers

-- Drop the overly permissive select policy
DROP POLICY IF EXISTS "profiles_select_optimized" ON public.profiles;

-- Create secure policies for profile access
-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON public.profiles
FOR SELECT 
USING (id = auth.uid());

-- Organization members can view profiles of other members in their organization
CREATE POLICY "org_members_view_member_profiles" ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT om.user_id 
    FROM public.organization_members om
    WHERE om.organization_id IN (
      SELECT om2.organization_id 
      FROM public.organization_members om2 
      WHERE om2.user_id = auth.uid() 
        AND om2.status = 'active'
    )
    AND om.status = 'active'
  )
);

-- Add comment documenting the security improvement
COMMENT ON TABLE public.profiles IS 'User profiles table - Access restricted to users own profile and organization members only for security';