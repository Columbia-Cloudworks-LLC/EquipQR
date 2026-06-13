-- Migration: peek Google Workspace OAuth session redirect context
-- Purpose: non-consuming redirect lookup for OAuth callback error path (service_role only)

CREATE OR REPLACE FUNCTION public.peek_google_workspace_oauth_session_redirect(
  p_session_token text
)
RETURNS TABLE(
  redirect_url text,
  origin_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_token IS NULL OR btrim(p_session_token) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.redirect_url, s.origin_url
  FROM public.google_workspace_oauth_sessions s
  WHERE s.session_token = p_session_token;
END;
$$;

COMMENT ON FUNCTION public.peek_google_workspace_oauth_session_redirect(text) IS
  'Returns OAuth session redirect context without marking the session used. service_role only (Edge OAuth callback error path).';

REVOKE ALL ON FUNCTION public.peek_google_workspace_oauth_session_redirect(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.peek_google_workspace_oauth_session_redirect(text) FROM anon;
REVOKE ALL ON FUNCTION public.peek_google_workspace_oauth_session_redirect(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.peek_google_workspace_oauth_session_redirect(text) TO service_role;
