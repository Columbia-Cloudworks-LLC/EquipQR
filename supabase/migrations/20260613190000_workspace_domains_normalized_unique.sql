-- Migration: enforce normalized workspace domain uniqueness
-- Purpose: prevent get_workspace_onboarding_state() from failing when duplicate
--          normalized domain rows exist in workspace_domains

-- Block concurrent writes while deduping and building the normalized unique index.
LOCK TABLE public.workspace_domains IN SHARE ROW EXCLUSIVE MODE;

-- Fail fast when normalized duplicates map to different organizations.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.workspace_domains
    GROUP BY public.normalize_domain(domain)
    HAVING count(DISTINCT organization_id) > 1
  ) THEN
    RAISE EXCEPTION
      'workspace_domains has normalized-domain rows with conflicting organization_id values';
  END IF;
END $$;

-- Remove normalized duplicates, keeping the newest row per normalized domain.
DELETE FROM public.workspace_domains d
WHERE d.ctid NOT IN (
  SELECT DISTINCT ON (public.normalize_domain(domain)) ctid
  FROM public.workspace_domains
  ORDER BY public.normalize_domain(domain), created_at DESC
);

-- Canonicalize stored domain text.
UPDATE public.workspace_domains
SET domain = public.normalize_domain(domain)
WHERE domain IS DISTINCT FROM public.normalize_domain(domain);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_domains_normalized_domain_unique
  ON public.workspace_domains (public.normalize_domain(domain));

COMMENT ON INDEX public.workspace_domains_normalized_domain_unique IS
  'Ensures workspace domain claims are unique after normalization (case/whitespace insensitive).';

CREATE OR REPLACE FUNCTION public.get_workspace_onboarding_state(p_user_id uuid)
RETURNS TABLE(
  email text,
  domain text,
  domain_status text,
  workspace_org_id uuid,
  is_workspace_connected boolean,
  has_workspace_membership boolean,
  has_pending_invitation boolean,
  has_pending_claim boolean,
  has_other_organization_membership boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_domain text;
  v_workspace_org_id uuid;
  v_connected boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  v_domain := split_part(public.normalize_email(v_email), '@', 2);

  SELECT d.organization_id
  INTO v_workspace_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = public.normalize_domain(v_domain)
  ORDER BY d.created_at DESC
  LIMIT 1;

  IF v_workspace_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.google_workspace_credentials gwc
      WHERE gwc.organization_id = v_workspace_org_id
        AND public.normalize_domain(gwc.domain) = public.normalize_domain(v_domain)
    ) INTO v_connected;
  END IF;

  email := v_email;
  domain := v_domain;
  workspace_org_id := v_workspace_org_id;
  is_workspace_connected := v_connected;
  domain_status := CASE
    WHEN v_workspace_org_id IS NOT NULL THEN 'claimed'
    ELSE 'unclaimed'
  END;

  has_workspace_membership := false;
  has_pending_invitation := false;
  has_pending_claim := false;
  has_other_organization_membership := false;

  IF v_workspace_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = v_workspace_org_id
        AND om.user_id = p_user_id
        AND om.status = 'active'
    ) INTO has_workspace_membership;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_invitations oi
      WHERE oi.organization_id = v_workspace_org_id
        AND public.normalize_email(oi.email) = public.normalize_email(v_email)
        AND oi.status = 'pending'
        AND oi.expires_at > now()
    ) INTO has_pending_invitation;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_member_claims c
      WHERE c.organization_id = v_workspace_org_id
        AND public.normalize_email(c.email) = public.normalize_email(v_email)
        AND c.status = 'selected'
    ) INTO has_pending_claim;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = p_user_id
        AND om.status = 'active'
        AND om.organization_id IS DISTINCT FROM v_workspace_org_id
    ) INTO has_other_organization_membership;
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_workspace_onboarding_state(uuid) IS
  'Returns workspace onboarding and claimed-domain access posture for a user. Self-only when auth.uid() is present.';

REVOKE ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_workspace_onboarding_state(uuid) FROM authenticated;

-- rpc-authenticated-grant-allowed: get_workspace_onboarding_state
GRANT EXECUTE ON FUNCTION public.get_workspace_onboarding_state(uuid) TO authenticated, service_role;
