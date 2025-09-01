
-- Fix the mutable search path issue in get_user_organization_membership function
CREATE OR REPLACE FUNCTION public.get_user_organization_membership(user_uuid uuid)
RETURNS TABLE(organization_id uuid, role text, status text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT om.organization_id, om.role, om.status
  FROM public.organization_members om
  WHERE om.user_id = user_uuid AND om.status = 'active';
$$;
