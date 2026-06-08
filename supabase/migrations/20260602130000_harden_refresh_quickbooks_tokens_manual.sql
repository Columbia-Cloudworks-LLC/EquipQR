-- rpc-authenticated-grant-allowed: refresh_quickbooks_tokens_manual
-- ============================================================================
-- Migration: Harden refresh_quickbooks_tokens_manual (issue #762 follow-up)
--
-- Any authenticated user could previously trigger a global QuickBooks token
-- refresh. Require the caller to manage QuickBooks in at least one org that
-- has stored credentials.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_quickbooks_tokens_manual()
RETURNS TABLE(
  credentials_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cred_count INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    INNER JOIN public.quickbooks_credentials qc
      ON qc.organization_id = om.organization_id
    WHERE om.user_id = v_user_id
      AND om.status = 'active'
      AND public.can_user_manage_quickbooks(v_user_id, om.organization_id)
  ) THEN
    RAISE EXCEPTION 'QuickBooks management permission required'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO cred_count
  FROM public.quickbooks_credentials
  WHERE access_token_expires_at < (NOW() + INTERVAL '15 minutes')
    AND refresh_token_expires_at > NOW();

  PERFORM public.invoke_quickbooks_token_refresh();

  RETURN QUERY
  SELECT
    cred_count,
    ('Token refresh triggered for ' || cred_count || ' credentials. Check edge function logs for results.')::TEXT;
END;
$$;

COMMENT ON FUNCTION public.refresh_quickbooks_tokens_manual() IS
  'Manually triggers QuickBooks token refresh for callers with QuickBooks management permission in an org that has credentials.';
