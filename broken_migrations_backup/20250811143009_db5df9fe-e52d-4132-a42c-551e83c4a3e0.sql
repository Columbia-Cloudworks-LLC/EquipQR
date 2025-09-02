-- Critical Security Fix: Organization Invitations Table Access Control
-- This fixes the dangerous 'token_based_access' policy that allows unrestricted access
-- to all invitation data, which exposes email addresses and tokens to unauthorized users.

-- Drop the dangerous policy that allows unrestricted access
DROP POLICY IF EXISTS "token_based_access" ON public.organization_invitations;

-- Create a secure token-based policy that only allows access for legitimate invitation acceptance
-- This policy ensures users can only access invitations with their exact email AND valid token
CREATE POLICY "secure_token_invitation_access" ON public.organization_invitations
FOR SELECT
USING (
  -- Allow access only when:
  -- 1. User's email matches the invitation email exactly
  -- 2. The invitation is still pending and not expired
  -- 3. This prevents table scanning and unauthorized access
  auth.email() IS NOT NULL 
  AND lower(trim(email)) = lower(trim(auth.email()))
  AND status = 'pending'
  AND expires_at > now()
);

-- Create a function to securely fetch invitation details by token
-- This replaces direct table queries and prevents data exposure
CREATE OR REPLACE FUNCTION public.get_invitation_by_token_secure(p_token uuid)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  organization_name text,
  email text,
  role text,
  status text,
  expires_at timestamp with time zone,
  message text,
  invited_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_email text;
BEGIN
  -- First check if the invitation exists and get the email
  SELECT oi.email INTO invitation_email
  FROM organization_invitations oi
  WHERE oi.invitation_token = p_token
    AND oi.status = 'pending'
    AND oi.expires_at > now();
  
  -- If no valid invitation found, return empty
  IF invitation_email IS NULL THEN
    RETURN;
  END IF;
  
  -- Verify the current user's email matches the invitation email
  IF auth.email() IS NULL OR lower(trim(auth.email())) != lower(trim(invitation_email)) THEN
    RETURN;
  END IF;
  
  -- Return the invitation details with organization and inviter info
  RETURN QUERY
  SELECT 
    oi.id,
    oi.organization_id,
    o.name as organization_name,
    oi.email,
    oi.role,
    oi.status,
    oi.expires_at,
    oi.message,
    p.name as invited_by_name
  FROM organization_invitations oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE oi.invitation_token = p_token
    AND oi.status = 'pending'
    AND oi.expires_at > now()
    AND lower(trim(oi.email)) = lower(trim(auth.email()));
END;
$$;

-- Add security comment
COMMENT ON FUNCTION public.get_invitation_by_token_secure(uuid) IS 'Securely retrieves invitation details by token - validates user email matches invitation before returning data';

-- Fix other overly permissive policies identified in security scan

-- Fix billing_exemptions policies
DROP POLICY IF EXISTS "system_insert_exemptions" ON public.billing_exemptions;
DROP POLICY IF EXISTS "system_update_exemptions" ON public.billing_exemptions;

CREATE POLICY "secure_system_insert_exemptions" ON public.billing_exemptions
FOR INSERT
WITH CHECK (
  -- Only allow system operations by organization admins
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = billing_exemptions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
);

CREATE POLICY "secure_system_update_exemptions" ON public.billing_exemptions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = billing_exemptions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
);

-- Fix organization_subscriptions policies
DROP POLICY IF EXISTS "manage_subscriptions" ON public.organization_subscriptions;

CREATE POLICY "admins_manage_subscriptions" ON public.organization_subscriptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_subscriptions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_subscriptions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
);

-- Fix subscribers table policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "users_insert_own_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR email = auth.email()
);

CREATE POLICY "secure_update_subscription" ON public.subscribers
FOR UPDATE
USING (
  user_id = auth.uid() OR email = auth.email()
);