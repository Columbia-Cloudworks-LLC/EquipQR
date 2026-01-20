-- Migration: Workspace domain claim email notifications
-- Description: Adds notification tracking columns and updates RPC to support organization context
-- Author: System
-- Date: 2026-01-20

-- =============================================================================
-- Add notification tracking columns to workspace_domain_claims
-- =============================================================================

-- Add organization_id to track which org context the claim was made from
-- This allows notifying admins of the requesting user's organization
ALTER TABLE public.workspace_domain_claims
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add notification tracking fields
ALTER TABLE public.workspace_domain_claims
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notified_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workspace_domain_claims.organization_id IS 
  'The organization context from which the domain claim was requested. Used to notify org admins.';

COMMENT ON COLUMN public.workspace_domain_claims.admin_notified_at IS 
  'Timestamp of the last admin notification email sent. Used for cooldown enforcement (24h).';

COMMENT ON COLUMN public.workspace_domain_claims.admin_notified_by_user_id IS 
  'User who triggered the last admin notification email.';

-- =============================================================================
-- Update request_workspace_domain_claim RPC to accept organization_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.request_workspace_domain_claim(
  p_domain text,
  p_organization_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_domain text;
  v_claim_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_domain := public.normalize_domain(p_domain);

  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  -- If organization_id provided, verify user is a member
  IF p_organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
        AND om.user_id = v_user_id
        AND om.status = 'active'
    ) THEN
      RAISE EXCEPTION 'User is not a member of the specified organization';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = v_domain
  ) THEN
    RAISE EXCEPTION 'Domain already claimed';
  END IF;

  -- Check for existing pending/approved claim
  IF EXISTS (
    SELECT 1 FROM public.workspace_domain_claims c
    WHERE public.normalize_domain(c.domain) = v_domain
      AND c.status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'A claim for this domain already exists';
  END IF;

  INSERT INTO public.workspace_domain_claims (
    domain,
    requested_by_user_id,
    organization_id,
    status
  ) VALUES (
    v_domain,
    v_user_id,
    p_organization_id,
    'pending'
  ) RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;

COMMENT ON FUNCTION public.request_workspace_domain_claim(text, uuid) IS 
  'Request a workspace domain claim. Optionally accepts organization_id to track which org context the request came from for admin notifications.';

-- =============================================================================
-- Add RPC to update notification timestamp (for edge function use)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_workspace_claim_notification(
  p_claim_id uuid,
  p_notified_by_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workspace_domain_claims
  SET admin_notified_at = now(),
      admin_notified_by_user_id = p_notified_by_user_id
  WHERE id = p_claim_id;
END;
$$;

COMMENT ON FUNCTION public.update_workspace_claim_notification(uuid, uuid) IS 
  'Updates the notification timestamp for a workspace domain claim. Called by the edge function after sending admin emails.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_workspace_claim_notification(uuid, uuid) TO service_role;

-- =============================================================================
-- Add RPC to get pending claim details (for edge function use)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_pending_workspace_claim_for_notification(
  p_domain text
)
RETURNS TABLE(
  claim_id uuid,
  domain text,
  requested_by_user_id uuid,
  requester_email text,
  requester_name text,
  organization_id uuid,
  organization_name text,
  admin_notified_at timestamptz,
  requested_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
BEGIN
  v_domain := public.normalize_domain(p_domain);

  RETURN QUERY
  SELECT 
    c.id AS claim_id,
    c.domain,
    c.requested_by_user_id,
    u.email AS requester_email,
    p.name AS requester_name,
    c.organization_id,
    o.name AS organization_name,
    c.admin_notified_at,
    c.requested_at
  FROM public.workspace_domain_claims c
  JOIN auth.users u ON u.id = c.requested_by_user_id
  LEFT JOIN public.profiles p ON p.id = c.requested_by_user_id
  LEFT JOIN public.organizations o ON o.id = c.organization_id
  WHERE public.normalize_domain(c.domain) = v_domain
    AND c.status = 'pending'
  ORDER BY c.requested_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_pending_workspace_claim_for_notification(text) IS 
  'Retrieves pending workspace domain claim details for sending notification emails.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pending_workspace_claim_for_notification(text) TO service_role;

-- =============================================================================
-- Add RPC to get admin emails for notification
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_workspace_claim_notification_recipients(
  p_organization_id uuid,
  p_super_admin_org_id uuid
)
RETURNS TABLE(
  user_id uuid,
  email text,
  name text,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    om.user_id,
    COALESCE(p.email, u.email) AS email,
    p.name,
    (om.organization_id = p_super_admin_org_id) AS is_super_admin
  FROM public.organization_members om
  JOIN auth.users u ON u.id = om.user_id
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.status = 'active'
    AND om.role IN ('owner', 'admin')
    AND (
      -- Include requesting org admins (if org provided)
      (p_organization_id IS NOT NULL AND om.organization_id = p_organization_id)
      OR
      -- Include super admins (if super admin org provided)
      (p_super_admin_org_id IS NOT NULL AND om.organization_id = p_super_admin_org_id)
    )
    AND COALESCE(p.email, u.email) IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.get_workspace_claim_notification_recipients(uuid, uuid) IS 
  'Retrieves admin/owner emails from the specified organization and super admin organization for sending claim notification emails.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_workspace_claim_notification_recipients(uuid, uuid) TO service_role;
