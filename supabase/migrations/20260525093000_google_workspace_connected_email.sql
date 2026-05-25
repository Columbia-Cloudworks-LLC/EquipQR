-- Migration: add connected admin email to Google Workspace credentials
-- Purpose: surface which Google admin account owns the org Workspace connection in UI

ALTER TABLE public.google_workspace_credentials
  ADD COLUMN IF NOT EXISTS connected_email text;

COMMENT ON COLUMN public.google_workspace_credentials.connected_email IS
  'Primary email of the Google Workspace admin who authorized the connection.';

CREATE OR REPLACE FUNCTION public.get_google_workspace_connection_status(
  p_organization_id uuid
)
RETURNS TABLE(
  is_connected boolean,
  domain text,
  connected_at timestamptz,
  access_token_expires_at timestamptz,
  scopes text,
  connected_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_credentials record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can view Google Workspace connection';
  END IF;

  SELECT
    gwc.domain,
    gwc.created_at,
    gwc.access_token_expires_at,
    gwc.scopes,
    gwc.connected_email
  INTO v_credentials
  FROM public.google_workspace_credentials gwc
  WHERE gwc.organization_id = p_organization_id
  ORDER BY gwc.created_at DESC
  LIMIT 1;

  IF v_credentials IS NULL THEN
    RETURN QUERY SELECT
      false::boolean,
      NULL::text,
      NULL::timestamptz,
      NULL::timestamptz,
      NULL::text,
      NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::boolean,
    v_credentials.domain,
    v_credentials.created_at,
    v_credentials.access_token_expires_at,
    v_credentials.scopes,
    v_credentials.connected_email;
END;
$$;

COMMENT ON FUNCTION public.get_google_workspace_connection_status(uuid) IS
  'Returns Google Workspace connection metadata for an organization, including connected admin email.';
