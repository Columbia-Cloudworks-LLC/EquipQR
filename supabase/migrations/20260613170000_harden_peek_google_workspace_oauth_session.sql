-- Migration: harden peek Google Workspace OAuth session for error callback path
-- Purpose: bind redirect peek to session nonce + lifecycle without consuming used_at

DROP FUNCTION IF EXISTS public.peek_google_workspace_oauth_session_redirect(text);

CREATE OR REPLACE FUNCTION public.peek_google_workspace_oauth_session(
  p_session_token text,
  p_nonce text
)
RETURNS TABLE(
  redirect_url text,
  origin_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_session_token IS NULL OR btrim(p_session_token) = ''
     OR p_nonce IS NULL OR btrim(p_nonce) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.redirect_url, s.origin_url
  FROM public.google_workspace_oauth_sessions s
  WHERE s.session_token = p_session_token
    AND s.nonce = p_nonce
    AND s.expires_at > now()
    AND s.used_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.peek_google_workspace_oauth_session(text, text) IS
  'Returns OAuth session redirect context when token, nonce, expiry, and unused checks pass. Does not mark used_at. service_role only (Edge OAuth callback error path).';

REVOKE ALL ON FUNCTION public.peek_google_workspace_oauth_session(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.peek_google_workspace_oauth_session(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.peek_google_workspace_oauth_session(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.peek_google_workspace_oauth_session(text, text) TO service_role;
