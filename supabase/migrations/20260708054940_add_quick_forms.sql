-- Migration: Quick Forms domain (#1184)
--
-- Standalone public data-collection forms, modeled on the operator daily
-- check-in architecture but deliberately NOT tied to equipment or teams.
-- Org owners/admins define quick forms (time sheets, secure-area checks,
-- assembly-line checklists, ...), share them via non-enumerable QR tokens,
-- and read an append-only submission ledger. No other member roles have any
-- access — the collected data may be sensitive.
--
-- Down migration (manual):
--   DROP FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text);
--   DROP FUNCTION public.resolve_quick_form_by_token(text);
--   DROP FUNCTION public.rotate_quick_form_token(uuid);
--   DROP FUNCTION public.create_quick_form(uuid, text, text, jsonb);
--   DROP TABLE public.quick_form_submissions;
--   DROP TABLE public.quick_form_token_secrets;
--   DROP TABLE public.quick_forms;

BEGIN;

CREATE TABLE IF NOT EXISTS public.quick_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  form_data jsonb NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  public_token_hash text NOT NULL,
  token_rotated_at timestamptz NOT NULL DEFAULT now(),
  token_rotated_by uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quick_forms IS
  'Org-owned standalone public data-collection forms (#1184). Not tied to equipment or teams; accessed by unauthenticated users via rotating QR token.';
COMMENT ON COLUMN public.quick_forms.form_data IS
  'JSON object: fields (array of { id, label, inputType, required, helpText }) and optional collectLocation flag.';
COMMENT ON COLUMN public.quick_forms.public_token_hash IS
  'SHA-256 hex digest of the public QR token. Lookup key for edge function load/submit.';

CREATE INDEX IF NOT EXISTS idx_quick_forms_org
  ON public.quick_forms(organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_forms_token_hash
  ON public.quick_forms(public_token_hash);

CREATE TABLE IF NOT EXISTS public.quick_form_token_secrets (
  quick_form_id uuid PRIMARY KEY
    REFERENCES public.quick_forms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  raw_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quick_form_token_secrets IS
  'Raw quick form QR tokens keyed by form. Admin-only read via RLS; written exclusively by SECURITY DEFINER create/rotate RPCs so QR links stay printable from any device.';
COMMENT ON COLUMN public.quick_form_token_secrets.raw_token IS
  'Raw public QR token for /qr/quick-form/{token}. SHA-256 of this value matches quick_forms.public_token_hash.';

CREATE INDEX IF NOT EXISTS idx_quick_form_token_secrets_org
  ON public.quick_form_token_secrets(organization_id);

CREATE TABLE IF NOT EXISTS public.quick_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quick_form_id uuid NOT NULL REFERENCES public.quick_forms(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  form_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quick_form_submissions IS
  'Append-only ledger of public quick form submissions. Inserts via service role edge function only; reads restricted to org owners/admins.';
COMMENT ON COLUMN public.quick_form_submissions.form_snapshot IS
  'Frozen copy of the form name/description/field definitions at submission time.';
COMMENT ON COLUMN public.quick_form_submissions.field_values IS
  'Array of { field_id, label, input_type, value } for user-entered fields.';
COMMENT ON COLUMN public.quick_form_submissions.client_context IS
  'Object with submitted_timestamp, browser_timezone, and optional gps fields.';

CREATE INDEX IF NOT EXISTS idx_quick_form_submissions_org_submitted
  ON public.quick_form_submissions(organization_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_quick_form_submissions_form_submitted
  ON public.quick_form_submissions(quick_form_id, submitted_at DESC);

-- RLS: everything is owner/admin-only. Quick form data can be sensitive
-- (time sheets, secure-area access logs), so plain members get no access.
ALTER TABLE public.quick_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_form_token_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_form_submissions ENABLE ROW LEVEL SECURITY;

-- Defense in depth: anonymous clients interact with this domain exclusively
-- through the token RPCs / edge function, never via direct table access.
REVOKE ALL ON public.quick_forms FROM anon;
REVOKE ALL ON public.quick_form_token_secrets FROM anon;
REVOKE ALL ON public.quick_form_submissions FROM anon;

DROP POLICY IF EXISTS quick_forms_select_admin ON public.quick_forms;
CREATE POLICY quick_forms_select_admin
  ON public.quick_forms
  FOR SELECT USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- INSERT happens via create_quick_form SECURITY DEFINER RPC only (token +
-- secret are minted atomically), so no INSERT policy for authenticated.

DROP POLICY IF EXISTS quick_forms_update_admin ON public.quick_forms;
CREATE POLICY quick_forms_update_admin
  ON public.quick_forms
  FOR UPDATE USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS quick_forms_delete_admin ON public.quick_forms;
CREATE POLICY quick_forms_delete_admin
  ON public.quick_forms
  FOR DELETE USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS quick_form_token_secrets_select_admin ON public.quick_form_token_secrets;
CREATE POLICY quick_form_token_secrets_select_admin
  ON public.quick_form_token_secrets
  FOR SELECT USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS quick_form_submissions_select_admin ON public.quick_form_submissions;
CREATE POLICY quick_form_submissions_select_admin
  ON public.quick_form_submissions
  FOR SELECT USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- rpc-authenticated-grant-allowed: create_quick_form
CREATE OR REPLACE FUNCTION public.create_quick_form(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_form_data jsonb
)
RETURNS TABLE (quick_form_id uuid, raw_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_new_token text;
  v_new_hash text;
  v_form_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Form name is required';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  INSERT INTO public.quick_forms (
    organization_id,
    name,
    description,
    form_data,
    is_active,
    public_token_hash,
    token_rotated_at,
    token_rotated_by,
    created_by
  )
  VALUES (
    p_organization_id,
    trim(p_name),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    COALESCE(p_form_data, '{"fields":[]}'::jsonb),
    true,
    v_new_hash,
    now(),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_form_id;

  INSERT INTO public.quick_form_token_secrets (quick_form_id, organization_id, raw_token)
  VALUES (v_form_id, p_organization_id, v_new_token);

  quick_form_id := v_form_id;
  raw_token := v_new_token;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quick_form(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_quick_form(uuid, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_quick_form(uuid, text, text, jsonb) TO authenticated;

-- rpc-authenticated-grant-allowed: rotate_quick_form_token
CREATE OR REPLACE FUNCTION public.rotate_quick_form_token(p_quick_form_id uuid)
RETURNS TABLE (raw_token text, token_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
  v_new_token text;
  v_new_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.quick_forms
  WHERE id = p_quick_form_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Quick form not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  UPDATE public.quick_forms
  SET public_token_hash = v_new_hash,
      token_rotated_at = now(),
      token_rotated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_quick_form_id;

  INSERT INTO public.quick_form_token_secrets (quick_form_id, organization_id, raw_token)
  VALUES (p_quick_form_id, v_org_id, v_new_token)
  ON CONFLICT (quick_form_id) DO UPDATE
    SET raw_token = EXCLUDED.raw_token,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();

  raw_token := v_new_token;
  token_hash := v_new_hash;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_quick_form_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotate_quick_form_token(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rotate_quick_form_token(uuid) TO authenticated;

-- rpc-anon-grant-allowed: resolve_quick_form_by_token
-- rpc-authenticated-grant-allowed: resolve_quick_form_by_token
CREATE OR REPLACE FUNCTION public.resolve_quick_form_by_token(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF p_token_hash IS NULL OR length(trim(p_token_hash)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    f.id,
    f.organization_id,
    f.name,
    f.description,
    f.form_data,
    f.is_active,
    o.name AS organization_name
  INTO v_row
  FROM public.quick_forms f
  JOIN public.organizations o ON o.id = f.organization_id
  WHERE f.public_token_hash = p_token_hash
    AND f.is_active = true
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'name', v_row.name,
    'description', v_row.description,
    'form_data', v_row.form_data,
    'is_active', v_row.is_active,
    'organization_name', v_row.organization_name
  );
END;
$$;

-- Token-gated resolver must work for signed-out AND signed-in visitors
-- (e.g. an admin scanning their own QR code), matching
-- resolve_operator_checkin_by_token.
REVOKE ALL ON FUNCTION public.resolve_quick_form_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_quick_form_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_quick_form_by_token(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quick_form_public(
  p_token_hash text,
  p_field_values jsonb,
  p_client_context jsonb,
  p_form_snapshot jsonb,
  p_request_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form record;
  v_submission_id uuid;
  v_submitted_at timestamptz := now();
  v_recent_count integer;
BEGIN
  SELECT f.id, f.organization_id, f.is_active
  INTO v_form
  FROM public.quick_forms f
  WHERE f.public_token_hash = p_token_hash
  LIMIT 1;

  IF v_form IS NULL OR NOT v_form.is_active THEN
    RAISE EXCEPTION 'Form is not available';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.quick_form_submissions sub
  WHERE sub.quick_form_id = v_form.id
    AND sub.submitted_at >= (now() - interval '1 hour');

  IF v_recent_count >= 60 THEN
    RAISE EXCEPTION 'Too many submissions. Please try again later.';
  END IF;

  INSERT INTO public.quick_form_submissions (
    organization_id,
    quick_form_id,
    submitted_at,
    form_snapshot,
    field_values,
    client_context,
    request_fingerprint
  ) VALUES (
    v_form.organization_id,
    v_form.id,
    v_submitted_at,
    COALESCE(p_form_snapshot, '{}'::jsonb),
    COALESCE(p_field_values, '[]'::jsonb),
    COALESCE(p_client_context, '{}'::jsonb),
    left(COALESCE(p_request_fingerprint, ''), 128)
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'id', v_submission_id,
    'submitted_at', v_submitted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) TO service_role;

COMMIT;
