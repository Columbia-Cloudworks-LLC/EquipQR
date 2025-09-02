-- Fix column ambiguity error in get_invitations_bypass_optimized function
-- The error occurs because both the return signature and organization_members table have a 'role' column

CREATE OR REPLACE FUNCTION public.get_invitations_bypass_optimized(user_uuid uuid, org_id uuid)
 RETURNS TABLE(id uuid, email text, role text, status text, message text, created_at timestamp with time zone, expires_at timestamp with time zone, accepted_at timestamp with time zone, declined_at timestamp with time zone, expired_at timestamp with time zone, slot_reserved boolean, slot_purchase_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  is_admin_result boolean := false;
BEGIN
  -- Direct admin check with explicit table qualification
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')  -- Explicitly qualify as om.role
      AND om.status = 'active'
  ) INTO is_admin_result;
  
  IF is_admin_result THEN
    -- Admins see all invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    ORDER BY oi.created_at DESC;
  ELSE
    -- Regular users see only their own invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
      AND oi.invited_by = user_uuid
    ORDER BY oi.created_at DESC;
  END IF;
END;
$function$;