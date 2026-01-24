-- =============================================================================
-- Fix auto_provision_workspace_organization to reuse ANY non-personal org
-- 
-- Previously, the function only reused orgs with "Organization" in the name,
-- which was too restrictive. If a user manually created an org with a custom
-- name (e.g., "Columbia Cloud Works" instead of "Columbiacloudworks Organization"),
-- connecting Google Workspace would create a NEW org instead of using their existing one.
--
-- This fix removes the name restriction so the function reuses ANY non-personal
-- org the user owns, regardless of its name.
--
-- REVERT: Re-add `AND o.name LIKE '%Organization%'` to the query on line 48-56
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_provision_workspace_organization(
  p_user_id uuid,
  p_domain text,
  p_organization_name text
)
RETURNS TABLE(
  organization_id uuid,
  domain text,
  already_existed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_org_id uuid;
  v_existing_org_id uuid;
BEGIN
  v_domain := public.normalize_domain(p_domain);

  -- Block consumer domains
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  -- Check if domain already has an organization
  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL THEN
    -- Domain already claimed, return existing org
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if user already owns a non-personal organization that could be reused
  -- This handles both:
  -- 1. "Full Reset" case where domain was unclaimed but org still exists
  -- 2. User connecting Google Workspace to their existing manually-created org
  --
  -- REMOVED: `AND o.name LIKE '%Organization%'` - was too restrictive and prevented
  -- reusing orgs with custom names. Since users can't arbitrarily create orgs,
  -- we should reuse ANY non-personal org they own.
  SELECT o.id INTO v_existing_org_id
  FROM public.organizations o
  JOIN public.organization_members om ON om.organization_id = o.id
  LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
  WHERE om.user_id = p_user_id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND po.organization_id IS NULL  -- Not a personal org
  ORDER BY o.created_at ASC  -- Use oldest org (likely their "real" org)
  LIMIT 1;

  IF v_existing_org_id IS NOT NULL THEN
    -- Reuse existing org, just claim domain for it
    INSERT INTO public.workspace_domains (domain, organization_id)
    VALUES (v_domain, v_existing_org_id)
    ON CONFLICT (domain) DO UPDATE SET organization_id = v_existing_org_id;
    
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Create new organization (only if user has no existing non-personal org)
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    p_organization_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  -- Create workspace_domains entry
  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id);

  organization_id := v_org_id;
  domain := v_domain;
  already_existed := false;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) IS 
  'Atomically provisions a new organization for a Google Workspace domain. Reuses ANY non-personal org if user is owner to prevent creating duplicate orgs when connecting Google Workspace.';
