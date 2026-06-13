-- Migration: reconcile Google Workspace directory by sync run timestamp
-- Purpose: avoid shipping full active google_user_id arrays over HTTP for large tenants

DROP FUNCTION IF EXISTS public.reconcile_google_workspace_directory(uuid, text[]);

CREATE OR REPLACE FUNCTION public.reconcile_google_workspace_directory(
  p_organization_id uuid,
  p_sync_started_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_directory_marked_suspended int := 0;
  v_members_deactivated int := 0;
  v_claims_revoked int := 0;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF p_sync_started_at IS NULL THEN
    RAISE EXCEPTION 'sync_started_at is required';
  END IF;

  UPDATE public.google_workspace_directory_users gdu
  SET suspended = true,
      updated_at = now()
  WHERE gdu.organization_id = p_organization_id
    AND (
      gdu.last_synced_at IS NULL
      OR gdu.last_synced_at < p_sync_started_at
    );
  GET DIAGNOSTICS v_directory_marked_suspended = ROW_COUNT;

  UPDATE public.organization_member_claims c
  SET status = 'revoked'
  WHERE c.organization_id = p_organization_id
    AND c.source = 'google_workspace'
    AND c.status IN ('selected', 'claimed')
    AND NOT EXISTS (
      SELECT 1
      FROM public.google_workspace_directory_users gdu
      WHERE gdu.organization_id = p_organization_id
        AND public.normalize_email(gdu.primary_email) = public.normalize_email(c.email)
        AND gdu.suspended = false
    );
  GET DIAGNOSTICS v_claims_revoked = ROW_COUNT;

  UPDATE public.organization_members om
  SET status = 'inactive'
  FROM auth.users u
  WHERE om.organization_id = p_organization_id
    AND om.user_id = u.id
    AND om.status = 'active'
    AND om.access_source = 'google_workspace'
    AND NOT EXISTS (
      SELECT 1
      FROM public.google_workspace_directory_users gdu
      WHERE gdu.organization_id = p_organization_id
        AND public.normalize_email(gdu.primary_email) = public.normalize_email(u.email)
        AND gdu.suspended = false
    );
  GET DIAGNOSTICS v_members_deactivated = ROW_COUNT;

  RETURN jsonb_build_object(
    'directory_marked_suspended', v_directory_marked_suspended,
    'members_deactivated', v_members_deactivated,
    'claims_revoked', v_claims_revoked
  );
END;
$$;

COMMENT ON FUNCTION public.reconcile_google_workspace_directory(uuid, timestamptz) IS
  'Marks directory users not refreshed during the sync run as suspended and revokes workspace-derived memberships/claims for inactive directory users.';

REVOKE ALL ON FUNCTION public.reconcile_google_workspace_directory(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_google_workspace_directory(uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_google_workspace_directory(uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_google_workspace_directory(uuid, timestamptz) TO service_role;
