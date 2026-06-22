-- =============================================================================
-- disconnect_google_workspace_internal: service-role cleanup without auth checks
-- Mirrors disconnect_google_workspace deletes for trusted edge callers (RISC).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.disconnect_google_workspace_internal(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_domain text;
  v_credentials_deleted int := 0;
  v_directory_users_deleted int := 0;
  v_domain_unclaimed int := 0;
BEGIN
  SELECT domain INTO v_domain
  FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id
  LIMIT 1;

  DELETE FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_credentials_deleted = ROW_COUNT;

  DELETE FROM public.google_workspace_directory_users
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_directory_users_deleted = ROW_COUNT;

  DELETE FROM public.workspace_domains
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_domain_unclaimed = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'credentials_deleted', v_credentials_deleted,
    'directory_users_deleted', v_directory_users_deleted,
    'domain_unclaimed', v_domain_unclaimed,
    'domain', v_domain
  );
END;
$$;

COMMENT ON FUNCTION public.disconnect_google_workspace_internal(uuid) IS
  'Service-role Google Workspace disconnect without membership checks. Deletes credentials, directory cache, and releases domain claim atomically.';

REVOKE ALL ON FUNCTION public.disconnect_google_workspace_internal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disconnect_google_workspace_internal(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.disconnect_google_workspace_internal(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_google_workspace_internal(uuid) TO service_role;
