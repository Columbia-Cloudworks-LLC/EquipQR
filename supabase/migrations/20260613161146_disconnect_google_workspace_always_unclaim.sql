-- =============================================================================
-- disconnect_google_workspace: always release workspace domain claim
-- p_also_unclaim_domain is retained for deploy compatibility but ignored.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.disconnect_google_workspace(
  p_organization_id uuid,
  p_also_unclaim_domain boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_domain text;
  v_credentials_deleted int := 0;
  v_domain_unclaimed int := 0;
  v_directory_users_deleted int := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND status = 'active';

  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Must be organization owner or admin to disconnect Google Workspace';
  END IF;

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

  IF v_domain IS NOT NULL THEN
    DELETE FROM public.workspace_domains
    WHERE organization_id = p_organization_id
      AND public.normalize_domain(domain) = public.normalize_domain(v_domain);
    GET DIAGNOSTICS v_domain_unclaimed = ROW_COUNT;
  ELSE
    DELETE FROM public.workspace_domains
    WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_domain_unclaimed = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credentials_deleted', v_credentials_deleted,
    'directory_users_deleted', v_directory_users_deleted,
    'domain_unclaimed', v_domain_unclaimed,
    'domain', v_domain
  );
END;
$$;

COMMENT ON FUNCTION public.disconnect_google_workspace(uuid, boolean) IS
  'Disconnects Google Workspace OAuth credentials, directory cache, and releases the workspace domain claim. p_also_unclaim_domain is deprecated and ignored (retained for deploy compatibility).';

REVOKE ALL ON FUNCTION public.disconnect_google_workspace(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disconnect_google_workspace(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.disconnect_google_workspace(uuid, boolean) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.disconnect_google_workspace(uuid, boolean) TO authenticated, service_role;
