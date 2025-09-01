-- Critical Security Fixes Migration (Corrected)
-- Fix 1: Lock down organization_members RLS to prevent privilege escalation

-- Drop the dangerous self-insert policy that allows users to add themselves to any org
DROP POLICY IF EXISTS "allow_member_insertion_fixed" ON public.organization_members;

-- Drop the overly permissive self-management policy that allows role escalation  
DROP POLICY IF EXISTS "members_manage_own_record_fixed" ON public.organization_members;

-- Create secure replacement policies
-- Only admins can insert new members (self-service only through secure RPCs)
CREATE POLICY "secure_admin_only_member_insert" 
ON public.organization_members 
FOR INSERT 
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Members can only read their own membership record
CREATE POLICY "members_read_own_record" 
ON public.organization_members 
FOR SELECT 
USING (user_id = auth.uid());

-- Only admins can update member records (no self role escalation)
CREATE POLICY "admins_only_update_members" 
ON public.organization_members 
FOR UPDATE 
USING (is_org_admin(auth.uid(), organization_id));

-- Only admins can delete members (no self-removal that bypasses business logic)
CREATE POLICY "admins_only_delete_members" 
ON public.organization_members 
FOR DELETE 
USING (is_org_admin(auth.uid(), organization_id));

-- Fix 2: Restrict notifications INSERT to service role only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "service_role_only_create_notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Fix 3: Add explicit RLS for stripe_event_logs (service role only)
CREATE POLICY "deny_user_access_stripe_logs" 
ON public.stripe_event_logs 
FOR ALL 
USING (false);

CREATE POLICY "service_role_manage_stripe_logs" 
ON public.stripe_event_logs 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Fix 4: Restrict invitation_performance_logs to service role
DROP POLICY IF EXISTS "system_insert_performance_logs" ON public.invitation_performance_logs;

CREATE POLICY "service_role_only_performance_logs" 
ON public.invitation_performance_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Fix 5: Create secure function to get member profiles with email privacy
CREATE OR REPLACE FUNCTION public.get_member_profiles_secure(org_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email_private boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id 
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this organization';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    CASE 
      WHEN p.email_private = true AND p.id != auth.uid() THEN NULL
      ELSE p.email
    END as email,
    p.created_at,
    p.updated_at,
    p.email_private
  FROM profiles p
  JOIN organization_members om ON p.id = om.user_id
  WHERE om.organization_id = org_id 
    AND om.status = 'active';
END;
$$;

-- Fix 6: Create secure function for controlled member self-removal
CREATE OR REPLACE FUNCTION public.leave_organization_safely(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
  owner_count INTEGER;
  result jsonb;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO user_role
  FROM organization_members
  WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND status = 'active';
  
  IF user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this organization');
  END IF;
  
  -- Prevent last owner from leaving
  IF user_role = 'owner' THEN
    SELECT COUNT(*) INTO owner_count
    FROM organization_members
    WHERE organization_id = org_id 
      AND role = 'owner' 
      AND status = 'active';
    
    IF owner_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot leave as the last owner');
    END IF;
  END IF;
  
  -- Preserve user attribution and handle team transfers
  PERFORM preserve_user_attribution(auth.uid());
  PERFORM handle_team_manager_removal(auth.uid(), org_id);
  
  -- Remove the user
  DELETE FROM organization_members
  WHERE user_id = auth.uid() 
    AND organization_id = org_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Successfully left organization');
END;
$$;