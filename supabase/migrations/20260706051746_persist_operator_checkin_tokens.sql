-- Migration: Persist operator check-in QR tokens across devices (#1154)
--
-- Raw QR tokens were previously generated client-side and cached only in
-- browser memory after mint, so a QR link created on one device could never
-- be viewed or re-printed from another device (or after a page reload).
--
-- This migration:
--   1. Adds an admin-readable `operator_checkin_token_secrets` table.
--   2. Moves assignment creation server-side (`create_operator_checkin_assignment`)
--      so the raw token is generated and persisted atomically.
--   3. Updates `rotate_operator_checkin_token` to persist the rotated raw token.
--
-- `public_token_hash` remains the only public lookup key; the anon resolve
-- RPC and edge function are unchanged. Raw tokens are readable exclusively
-- by organization owners/admins via RLS (the same roles that mint them).
--
-- Down migration (manual):
--   DROP FUNCTION public.create_operator_checkin_assignment(uuid, uuid, uuid, boolean);
--   DROP TABLE public.operator_checkin_token_secrets;
--   -- restore rotate_operator_checkin_token from 20260703120000_add_operator_checkins.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.operator_checkin_token_secrets (
  settings_id uuid PRIMARY KEY
    REFERENCES public.equipment_operator_checkin_settings(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  raw_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.operator_checkin_token_secrets IS
  'Raw operator check-in QR tokens keyed by assignment. Admin-only read via RLS; written exclusively by SECURITY DEFINER create/rotate RPCs so QR links stay printable from any device (#1154).';
COMMENT ON COLUMN public.operator_checkin_token_secrets.raw_token IS
  'Raw public QR token for /qr/operator-check-in/{token}. SHA-256 of this value matches equipment_operator_checkin_settings.public_token_hash.';

CREATE INDEX IF NOT EXISTS idx_operator_checkin_token_secrets_org
  ON public.operator_checkin_token_secrets(organization_id);

ALTER TABLE public.operator_checkin_token_secrets ENABLE ROW LEVEL SECURITY;

-- Owners/admins read tokens to display QR codes; all writes happen inside
-- SECURITY DEFINER RPCs (no INSERT/UPDATE/DELETE policies for authenticated).
DROP POLICY IF EXISTS operator_checkin_token_secrets_select_admin ON public.operator_checkin_token_secrets;
CREATE POLICY operator_checkin_token_secrets_select_admin
  ON public.operator_checkin_token_secrets
  FOR SELECT USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- rpc-authenticated-grant-allowed: create_operator_checkin_assignment
CREATE OR REPLACE FUNCTION public.create_operator_checkin_assignment(
  p_organization_id uuid,
  p_equipment_id uuid,
  p_template_id uuid,
  p_enabled boolean DEFAULT true
)
RETURNS TABLE (settings_id uuid, raw_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_new_token text;
  v_new_hash text;
  v_settings_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = p_equipment_id
      AND e.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Equipment not found in organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operator_checklist_templates tpl
    WHERE tpl.id = p_template_id
      AND tpl.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Template not found in organization';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  INSERT INTO public.equipment_operator_checkin_settings (
    organization_id,
    equipment_id,
    template_id,
    enabled,
    public_token_hash,
    token_rotated_at,
    token_rotated_by
  )
  VALUES (
    p_organization_id,
    p_equipment_id,
    p_template_id,
    COALESCE(p_enabled, true),
    v_new_hash,
    now(),
    auth.uid()
  )
  RETURNING id INTO v_settings_id;

  INSERT INTO public.operator_checkin_token_secrets (settings_id, organization_id, raw_token)
  VALUES (v_settings_id, p_organization_id, v_new_token);

  settings_id := v_settings_id;
  raw_token := v_new_token;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operator_checkin_assignment(uuid, uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_operator_checkin_assignment(uuid, uuid, uuid, boolean) TO authenticated;

-- rpc-authenticated-grant-allowed: rotate_operator_checkin_token
CREATE OR REPLACE FUNCTION public.rotate_operator_checkin_token(p_settings_id uuid)
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
  FROM public.equipment_operator_checkin_settings
  WHERE id = p_settings_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Settings not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  UPDATE public.equipment_operator_checkin_settings
  SET public_token_hash = v_new_hash,
      token_rotated_at = now(),
      token_rotated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_settings_id;

  INSERT INTO public.operator_checkin_token_secrets (settings_id, organization_id, raw_token)
  VALUES (p_settings_id, v_org_id, v_new_token)
  ON CONFLICT (settings_id) DO UPDATE
    SET raw_token = EXCLUDED.raw_token,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();

  raw_token := v_new_token;
  token_hash := v_new_hash;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_operator_checkin_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_operator_checkin_token(uuid) TO authenticated;

COMMIT;
