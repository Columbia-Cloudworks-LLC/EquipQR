-- =============================================================================
-- RPC: disconnect_google_workspace
-- Allows organization owners/admins to disconnect Google Workspace integration
-- This is useful for testing the onboarding flow multiple times
-- =============================================================================

CREATE OR REPLACE FUNCTION public.disconnect_google_workspace(
  p_organization_id uuid,
  p_also_unclaim_domain boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_domain text;
  v_credentials_deleted int := 0;
  v_domain_unclaimed int := 0;
  v_directory_users_deleted int := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check user is owner or admin of the organization
  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND status = 'active';
    
  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Must be organization owner or admin to disconnect Google Workspace';
  END IF;
  
  -- Get the domain from credentials before deleting
  SELECT domain INTO v_domain
  FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id
  LIMIT 1;
  
  -- Delete Google Workspace credentials
  DELETE FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_credentials_deleted = ROW_COUNT;
  
  -- Delete directory users cache if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_directory_users') THEN
    DELETE FROM public.workspace_directory_users
    WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_directory_users_deleted = ROW_COUNT;
  END IF;
  
  -- Optionally unclaim the domain (allows full re-onboarding)
  IF p_also_unclaim_domain AND v_domain IS NOT NULL THEN
    DELETE FROM public.workspace_domains
    WHERE organization_id = p_organization_id
      AND public.normalize_domain(domain) = public.normalize_domain(v_domain);
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
  'Disconnects Google Workspace integration for an organization. Only owners/admins can call this. Set also_unclaim_domain to true for full reset.';

-- Grant access
GRANT EXECUTE ON FUNCTION public.disconnect_google_workspace(uuid, boolean) TO authenticated;
