-- Migration: require directory membership for Google Workspace member import
-- Purpose: prevent arbitrary email claims when importing Workspace members

CREATE OR REPLACE FUNCTION public.select_google_workspace_members(
  p_organization_id uuid,
  p_emails text[],
  p_admin_emails text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_member_count int := 0;
  v_admin_applied int := 0;
  v_admin_pending int := 0;
  v_invalid_emails text[];
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
    RAISE EXCEPTION 'Only organization administrators can add members';
  END IF;

  SELECT array_agg(normalized_email ORDER BY normalized_email)
  INTO v_invalid_emails
  FROM (
    SELECT public.normalize_email(e) AS normalized_email
    FROM unnest(p_emails) AS e
  ) requested
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.google_workspace_directory_users gdu
    WHERE gdu.organization_id = p_organization_id
      AND public.normalize_email(gdu.primary_email) = requested.normalized_email
      AND gdu.suspended = false
  );

  IF v_invalid_emails IS NOT NULL AND array_length(v_invalid_emails, 1) > 0 THEN
    RAISE EXCEPTION
      'One or more emails are not active Google Workspace directory users for this organization: %',
      array_to_string(v_invalid_emails, ', ');
  END IF;

  INSERT INTO public.organization_member_claims (
    organization_id, email, source, status, created_by
  )
  SELECT
    p_organization_id,
    public.normalize_email(e),
    'google_workspace',
    'selected',
    v_user_id
  FROM unnest(p_emails) AS e
  ON CONFLICT (organization_id, public.normalize_email(email))
    WHERE status IN ('selected', 'claimed')
    DO UPDATE
      SET status = 'selected',
          created_by = EXCLUDED.created_by,
          created_at = now();

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  SELECT p_organization_id, u.id, 'member', 'active'
  FROM auth.users u
  WHERE public.normalize_email(u.email) = ANY (
    SELECT public.normalize_email(e) FROM unnest(p_emails) AS e
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_member_count = ROW_COUNT;

  INSERT INTO public.organization_role_grants_pending (
    organization_id, email, desired_role, status, created_by
  )
  SELECT
    p_organization_id,
    public.normalize_email(e),
    'admin',
    'pending',
    v_user_id
  FROM unnest(p_admin_emails) AS e
  ON CONFLICT (organization_id, public.normalize_email(email))
    WHERE status = 'pending'
    DO NOTHING;

  UPDATE public.organization_members om
  SET role = 'admin'
  FROM auth.users u
  WHERE om.organization_id = p_organization_id
    AND om.user_id = u.id
    AND public.normalize_email(u.email) = ANY (
      SELECT public.normalize_email(e) FROM unnest(p_admin_emails) AS e
    )
    AND om.role = 'member'
    AND public.is_user_google_oauth_verified(u.id);

  GET DIAGNOSTICS v_admin_applied = ROW_COUNT;

  UPDATE public.organization_role_grants_pending pg
  SET status = 'applied',
      applied_user_id = u.id,
      applied_at = now()
  FROM auth.users u
  WHERE pg.organization_id = p_organization_id
    AND pg.status = 'pending'
    AND public.normalize_email(pg.email) = public.normalize_email(u.email)
    AND public.is_user_google_oauth_verified(u.id);

  SELECT COUNT(*) INTO v_admin_pending
  FROM public.organization_role_grants_pending pg
  WHERE pg.organization_id = p_organization_id
    AND pg.status = 'pending';

  RETURN jsonb_build_object(
    'members_added', v_member_count,
    'admin_applied', v_admin_applied,
    'admin_pending', v_admin_pending
  );
END;
$$;

COMMENT ON FUNCTION public.select_google_workspace_members(uuid, text[], text[]) IS
  'Selects Google Workspace directory users as organization members. Every email must exist in google_workspace_directory_users for the org and not be suspended.';
