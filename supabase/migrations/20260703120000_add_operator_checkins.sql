-- Migration: Operator daily check-in domain (#1091)
--
-- Separate from authenticated scans and PM work orders. Org admins define
-- operator checklist templates, assign them to equipment with a non-enumerable
-- public token, and collect append-only submissions via edge function only.
--
-- Down migration (manual): DROP TABLE public.operator_checkin_submissions;
-- DROP TABLE public.equipment_operator_checkin_settings;
-- DROP TABLE public.operator_checklist_templates;

BEGIN;

CREATE TABLE IF NOT EXISTS public.operator_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL DEFAULT '{"checklistItems":[],"dataFields":[]}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.operator_checklist_templates IS
  'Org-owned daily operator safety checklist definitions for public QR check-ins (#1091).';
COMMENT ON COLUMN public.operator_checklist_templates.template_data IS
  'JSON object: checklistItems (pass/fail items) and dataFields (operator/client/equipment capture fields).';

CREATE INDEX IF NOT EXISTS idx_operator_checklist_templates_org
  ON public.operator_checklist_templates(organization_id);

CREATE TABLE IF NOT EXISTS public.equipment_operator_checkin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.operator_checklist_templates(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  public_token_hash text NOT NULL,
  token_rotated_at timestamptz NOT NULL DEFAULT now(),
  token_rotated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipment_operator_checkin_settings_equipment_template_unique UNIQUE (equipment_id, template_id)
);

COMMENT ON TABLE public.equipment_operator_checkin_settings IS
  'Per-equipment daily check-in assignments. Each row binds one checklist template to equipment with its own public QR token hash.';
COMMENT ON COLUMN public.equipment_operator_checkin_settings.public_token_hash IS
  'SHA-256 hex digest of the public QR token. Lookup key for edge function load/submit.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_operator_checkin_token_hash
  ON public.equipment_operator_checkin_settings(public_token_hash);

CREATE INDEX IF NOT EXISTS idx_equipment_operator_checkin_org
  ON public.equipment_operator_checkin_settings(organization_id);

CREATE TABLE IF NOT EXISTS public.operator_checkin_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.operator_checklist_templates(id) ON DELETE SET NULL,
  settings_id uuid NOT NULL REFERENCES public.equipment_operator_checkin_settings(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  template_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  operator_field_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_field_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  equipment_field_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_complete boolean NOT NULL DEFAULT false,
  required_item_count integer NOT NULL DEFAULT 0,
  answered_required_count integer NOT NULL DEFAULT 0,
  request_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.operator_checkin_submissions IS
  'Append-only ledger of public operator daily check-ins. Inserts via service role edge function only.';
COMMENT ON COLUMN public.operator_checkin_submissions.template_snapshot IS
  'Frozen copy of template metadata, checklist items, and data field definitions at submission time.';
COMMENT ON COLUMN public.operator_checkin_submissions.operator_field_values IS
  'Array of { field_id, label, source, value } for operator-entered fields.';
COMMENT ON COLUMN public.operator_checkin_submissions.client_field_values IS
  'Array of { field_id, label, source, value } for client context fields (timestamp, timezone, GPS).';
COMMENT ON COLUMN public.operator_checkin_submissions.equipment_field_values IS
  'Array of { field_id, label, source, value } for equipment snapshot fields at submission time.';
COMMENT ON COLUMN public.operator_checkin_submissions.checklist_answers IS
  'Array of { item_id, passed, notes? } answers validated server-side.';

CREATE INDEX IF NOT EXISTS idx_operator_checkin_submissions_org_submitted
  ON public.operator_checkin_submissions(organization_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_checkin_submissions_equipment_submitted
  ON public.operator_checkin_submissions(equipment_id, submitted_at DESC);

-- RLS
ALTER TABLE public.operator_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_operator_checkin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_checkin_submissions ENABLE ROW LEVEL SECURITY;

-- Templates: org members read; owner/admin manage
DROP POLICY IF EXISTS operator_checklist_templates_select_members ON public.operator_checklist_templates;
CREATE POLICY operator_checklist_templates_select_members
  ON public.operator_checklist_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = operator_checklist_templates.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS operator_checklist_templates_insert_admin ON public.operator_checklist_templates;
CREATE POLICY operator_checklist_templates_insert_admin
  ON public.operator_checklist_templates
  FOR INSERT WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.is_org_admin((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS operator_checklist_templates_update_admin ON public.operator_checklist_templates;
CREATE POLICY operator_checklist_templates_update_admin
  ON public.operator_checklist_templates
  FOR UPDATE USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS operator_checklist_templates_delete_admin ON public.operator_checklist_templates;
CREATE POLICY operator_checklist_templates_delete_admin
  ON public.operator_checklist_templates
  FOR DELETE USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- Settings: org members read; owner/admin manage
DROP POLICY IF EXISTS equipment_operator_checkin_settings_select_members ON public.equipment_operator_checkin_settings;
CREATE POLICY equipment_operator_checkin_settings_select_members
  ON public.equipment_operator_checkin_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = equipment_operator_checkin_settings.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS equipment_operator_checkin_settings_insert_admin ON public.equipment_operator_checkin_settings;
CREATE POLICY equipment_operator_checkin_settings_insert_admin
  ON public.equipment_operator_checkin_settings
  FOR INSERT WITH CHECK (
    public.is_org_admin((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_operator_checkin_settings.equipment_id
        AND e.organization_id = equipment_operator_checkin_settings.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM public.operator_checklist_templates tpl
      WHERE tpl.id = equipment_operator_checkin_settings.template_id
        AND tpl.organization_id = equipment_operator_checkin_settings.organization_id
    )
  );

DROP POLICY IF EXISTS equipment_operator_checkin_settings_update_admin ON public.equipment_operator_checkin_settings;
CREATE POLICY equipment_operator_checkin_settings_update_admin
  ON public.equipment_operator_checkin_settings
  FOR UPDATE
  USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    public.is_org_admin((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_operator_checkin_settings.equipment_id
        AND e.organization_id = equipment_operator_checkin_settings.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM public.operator_checklist_templates tpl
      WHERE tpl.id = equipment_operator_checkin_settings.template_id
        AND tpl.organization_id = equipment_operator_checkin_settings.organization_id
    )
  );

DROP POLICY IF EXISTS equipment_operator_checkin_settings_delete_admin ON public.equipment_operator_checkin_settings;
CREATE POLICY equipment_operator_checkin_settings_delete_admin
  ON public.equipment_operator_checkin_settings
  FOR DELETE USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- Submissions: org members read only; no INSERT/UPDATE/DELETE for authenticated users
DROP POLICY IF EXISTS operator_checkin_submissions_select_members ON public.operator_checkin_submissions;
CREATE POLICY operator_checkin_submissions_select_members
  ON public.operator_checkin_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = operator_checkin_submissions.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  );

-- rpc-authenticated-grant-allowed: rotate_operator_checkin_token
CREATE OR REPLACE FUNCTION public.rotate_operator_checkin_token(p_settings_id uuid)
RETURNS TABLE (raw_token text, token_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  raw_token := v_new_token;
  token_hash := v_new_hash;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_operator_checkin_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_operator_checkin_token(uuid) TO authenticated;

COMMIT;
