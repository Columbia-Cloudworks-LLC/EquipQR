-- ============================================================================
-- Migration: Workspace Personal Org Merge Requests
-- 
-- Purpose: Add request/approval workflow for per-user personal org merges
--          into a Workspace organization (owner/admin request → user consent).
-- ============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Extend notifications types for merge request workflow
-- =============================================================================

ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY[
    'work_order_request'::text, 
    'work_order_accepted'::text, 
    'work_order_assigned'::text, 
    'work_order_completed'::text,
    'work_order_submitted'::text,
    'work_order_in_progress'::text,
    'work_order_on_hold'::text,
    'work_order_cancelled'::text,
    'general'::text,
    'ownership_transfer_request'::text,
    'ownership_transfer_accepted'::text,
    'ownership_transfer_rejected'::text,
    'ownership_transfer_cancelled'::text,
    'member_removed'::text,
    'workspace_migration'::text,
    'workspace_merge_request'::text,
    'workspace_merge_accepted'::text,
    'workspace_merge_rejected'::text
  ]));

-- =============================================================================
-- PART 2: Create workspace personal org merge requests table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_personal_org_merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_for_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by_name TEXT NOT NULL,
  requested_for_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  request_reason TEXT,
  response_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.workspace_personal_org_merge_requests IS
  'Tracks pending and completed requests to merge a user''s personal organization into a Workspace organization. Consent-based, per-user only.';

CREATE INDEX IF NOT EXISTS idx_workspace_merge_org
  ON public.workspace_personal_org_merge_requests(workspace_org_id);

CREATE INDEX IF NOT EXISTS idx_workspace_merge_requested_by
  ON public.workspace_personal_org_merge_requests(requested_by_user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_merge_requested_for
  ON public.workspace_personal_org_merge_requests(requested_for_user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_merge_pending
  ON public.workspace_personal_org_merge_requests(status)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS workspace_merge_unique_pending
  ON public.workspace_personal_org_merge_requests(workspace_org_id, requested_for_user_id)
  WHERE status = 'pending';

-- =============================================================================
-- PART 3: RLS for workspace_personal_org_merge_requests
-- =============================================================================

ALTER TABLE public.workspace_personal_org_merge_requests ENABLE ROW LEVEL SECURITY;

-- Owners/admins can view merge requests for their organization
DROP POLICY IF EXISTS "workspace_merge_admins_view_requests" ON public.workspace_personal_org_merge_requests;
CREATE POLICY "workspace_merge_admins_view_requests"
  ON public.workspace_personal_org_merge_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workspace_personal_org_merge_requests.workspace_org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Target user can view their own merge requests
DROP POLICY IF EXISTS "workspace_merge_user_view_own_requests" ON public.workspace_personal_org_merge_requests;
CREATE POLICY "workspace_merge_user_view_own_requests"
  ON public.workspace_personal_org_merge_requests
  FOR SELECT
  TO authenticated
  USING (requested_for_user_id = auth.uid());

-- Only service role can directly manage (RPCs use SECURITY DEFINER)
DROP POLICY IF EXISTS "service_role_manage_workspace_merge_requests" ON public.workspace_personal_org_merge_requests;
CREATE POLICY "service_role_manage_workspace_merge_requests"
  ON public.workspace_personal_org_merge_requests
  FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- PART 4: RPCs for request/response workflow
-- =============================================================================

CREATE OR REPLACE FUNCTION public.request_workspace_personal_org_merge(
  p_workspace_org_id uuid,
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_requester_name text;
  v_target_name text;
  v_org_name text;
  v_existing_pending uuid;
  v_request_id uuid;
  v_personal_org_id uuid;
BEGIN
  v_requester_id := auth.uid();

  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate requester is an active owner/admin of the workspace org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_workspace_org_id
      AND om.user_id = v_requester_id
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only organization administrators can request a merge');
  END IF;

  -- Validate target is an active member of the workspace org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_workspace_org_id
      AND om.user_id = p_target_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user must be an active member of the organization');
  END IF;

  -- Ensure target has a personal organization to merge
  SELECT organization_id INTO v_personal_org_id
  FROM public.personal_organizations
  WHERE user_id = p_target_user_id;

  IF v_personal_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user does not have a personal organization to merge');
  END IF;

  -- Expire any pending requests that are past their expiration
  UPDATE public.workspace_personal_org_merge_requests
  SET status = 'expired',
      responded_at = now(),
      completed_at = now()
  WHERE workspace_org_id = p_workspace_org_id
    AND requested_for_user_id = p_target_user_id
    AND status = 'pending'
    AND expires_at < now();

  -- Prevent duplicate active requests
  SELECT id INTO v_existing_pending
  FROM public.workspace_personal_org_merge_requests
  WHERE workspace_org_id = p_workspace_org_id
    AND requested_for_user_id = p_target_user_id
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF v_existing_pending IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A pending merge request already exists for this user');
  END IF;

  SELECT COALESCE(name, 'Unknown') INTO v_requester_name
  FROM public.profiles WHERE id = v_requester_id;

  SELECT COALESCE(name, 'Unknown') INTO v_target_name
  FROM public.profiles WHERE id = p_target_user_id;

  SELECT COALESCE(name, 'Organization') INTO v_org_name
  FROM public.organizations WHERE id = p_workspace_org_id;

  INSERT INTO public.workspace_personal_org_merge_requests (
    workspace_org_id,
    requested_by_user_id,
    requested_for_user_id,
    requested_by_name,
    requested_for_name,
    request_reason
  ) VALUES (
    p_workspace_org_id,
    v_requester_id,
    p_target_user_id,
    v_requester_name,
    v_target_name,
    p_reason
  ) RETURNING id INTO v_request_id;

  INSERT INTO public.notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data,
    is_global
  ) VALUES (
    p_workspace_org_id,
    p_target_user_id,
    'workspace_merge_request',
    'Data merge requested',
    v_requester_name || ' requested to merge your personal organization into ' || v_org_name || '.',
    jsonb_build_object(
      'organization_id', p_workspace_org_id,
      'merge_request_id', v_request_id,
      'workspace_org_id', p_workspace_org_id,
      'workspace_org_name', v_org_name,
      'requested_by_user_id', v_requester_id,
      'requested_by_name', v_requester_name
    ),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Merge request sent to ' || v_target_name
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.request_workspace_personal_org_merge(uuid, uuid, text) IS
  'Request that a user merge their personal organization into a Workspace organization. Only owners/admins may request.';

CREATE OR REPLACE FUNCTION public.get_pending_workspace_personal_org_merge_requests()
RETURNS TABLE(
  id uuid,
  workspace_org_id uuid,
  workspace_org_name text,
  requested_by_user_id uuid,
  requested_by_name text,
  requested_for_user_id uuid,
  requested_for_name text,
  request_reason text,
  created_at timestamptz,
  expires_at timestamptz,
  is_incoming boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();

  RETURN QUERY
  SELECT 
    r.id,
    r.workspace_org_id,
    o.name AS workspace_org_name,
    r.requested_by_user_id,
    r.requested_by_name,
    r.requested_for_user_id,
    r.requested_for_name,
    r.request_reason,
    r.created_at,
    r.expires_at,
    (r.requested_for_user_id = v_current_user_id) AS is_incoming
  FROM public.workspace_personal_org_merge_requests r
  JOIN public.organizations o ON o.id = r.workspace_org_id
  WHERE r.status = 'pending'
    AND r.expires_at > now()
    AND (r.requested_for_user_id = v_current_user_id OR r.requested_by_user_id = v_current_user_id);
END;
$$;

COMMENT ON FUNCTION public.get_pending_workspace_personal_org_merge_requests() IS
  'Get all pending personal org merge requests for the current user (incoming/outgoing).';

CREATE OR REPLACE FUNCTION public.respond_to_workspace_personal_org_merge(
  p_request_id uuid,
  p_accept boolean,
  p_response_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_request RECORD;
  v_current_user_id uuid;
  v_org_name text;
  v_migration_stats jsonb;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_request
  FROM public.workspace_personal_org_merge_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Merge request not found');
  END IF;

  IF v_request.requested_for_user_id != v_current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the target user can respond to this merge request');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This merge request has already been processed');
  END IF;

  IF v_request.expires_at < now() THEN
    UPDATE public.workspace_personal_org_merge_requests
    SET status = 'expired',
        responded_at = now(),
        completed_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', false, 'error', 'This merge request has expired');
  END IF;

  SELECT COALESCE(name, 'Organization') INTO v_org_name
  FROM public.organizations WHERE id = v_request.workspace_org_id;

  IF p_accept THEN
    -- Accept and execute per-user migration
    EXECUTE
      'SELECT public.migrate_personal_org_to_workspace_for_user($1, $2)'
    INTO v_migration_stats
    USING v_request.workspace_org_id, v_request.requested_for_user_id;

    UPDATE public.workspace_personal_org_merge_requests
    SET status = 'accepted',
        response_reason = p_response_reason,
        responded_at = now(),
        completed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_request.workspace_org_id,
      v_request.requested_by_user_id,
      'workspace_merge_accepted',
      'Data merge accepted',
      v_request.requested_for_name || ' accepted the personal org merge into ' || v_org_name || '.',
      jsonb_build_object(
        'organization_id', v_request.workspace_org_id,
        'merge_request_id', v_request.id,
        'workspace_org_id', v_request.workspace_org_id,
        'workspace_org_name', v_org_name
      ),
      true
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Personal organization merged into ' || v_org_name,
      'migration_stats', v_migration_stats
    );
  ELSE
    UPDATE public.workspace_personal_org_merge_requests
    SET status = 'rejected',
        response_reason = p_response_reason,
        responded_at = now(),
        completed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_request.workspace_org_id,
      v_request.requested_by_user_id,
      'workspace_merge_rejected',
      'Data merge rejected',
      v_request.requested_for_name || ' declined the personal org merge into ' || v_org_name || '.',
      jsonb_build_object(
        'organization_id', v_request.workspace_org_id,
        'merge_request_id', v_request.id,
        'workspace_org_id', v_request.workspace_org_id,
        'workspace_org_name', v_org_name
      ),
      true
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Merge request rejected'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.respond_to_workspace_personal_org_merge(uuid, boolean, text) IS
  'Accept or reject a personal org merge request. Only the target user can respond.';

-- =============================================================================
-- PART 5: Grants
-- =============================================================================

GRANT ALL ON TABLE public.workspace_personal_org_merge_requests TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_workspace_personal_org_merge(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_workspace_personal_org_merge_requests() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_workspace_personal_org_merge(uuid, boolean, text) TO authenticated, service_role;

COMMIT;
