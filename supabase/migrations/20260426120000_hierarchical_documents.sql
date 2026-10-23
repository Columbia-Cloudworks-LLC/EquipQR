-- Hierarchical Documents (Org / Team / Equipment / Work Order) (#1422)
-- Stores Google Drive file references, materialized GPO-style scope attachments,
-- renewal sign-offs, work-order Drive folder records, and pure DB rental readiness checks.

CREATE TABLE IF NOT EXISTS public.organization_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_id text NOT NULL,
  title text NOT NULL,
  mime_type text,
  web_view_link text,
  document_type text DEFAULT 'policy'::text NOT NULL CHECK (
    document_type IN (
      'rental_insurance',
      'policy',
      'manual',
      'certificate',
      'work_order_attachment',
      'other'
    )
  ),
  is_required boolean DEFAULT false NOT NULL,
  renewal_days integer CHECK (renewal_days IS NULL OR renewal_days IN (30, 90, 180, 365)),
  reminder_offsets integer[] DEFAULT ARRAY[]::integer[] NOT NULL CHECK (cardinality(reminder_offsets) <= 3),
  notification_recipient_emails text[] DEFAULT ARRAY[]::text[] NOT NULL CHECK (cardinality(notification_recipient_emails) <= 15),
  last_signed_at timestamp with time zone,
  last_signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  superseded_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT organization_documents_org_file_id_key UNIQUE (organization_id, file_id)
);

ALTER TABLE public.organization_documents OWNER TO postgres;

COMMENT ON TABLE public.organization_documents IS 'Canonical Google Drive document references for an organization (#1422). Free tier allows up to 25 active non-superseded policy/canonical documents per organization.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_documents_single_required_rental_insurance
  ON public.organization_documents USING btree (organization_id)
  WHERE ((document_type = 'rental_insurance'::text) AND (is_required = true) AND (deleted_at IS NULL) AND (superseded_at IS NULL));

CREATE INDEX IF NOT EXISTS idx_organization_documents_org_active
  ON public.organization_documents USING btree (organization_id, document_type)
  WHERE ((deleted_at IS NULL) AND (superseded_at IS NULL));

CREATE TABLE IF NOT EXISTS public.document_attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.organization_documents(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('organization', 'team', 'equipment', 'work_order')),
  scope_id uuid NOT NULL,
  is_override boolean DEFAULT false NOT NULL,
  snapshot_file_id text NOT NULL,
  snapshot_title text NOT NULL,
  snapshot_renewal_days integer CHECK (snapshot_renewal_days IS NULL OR snapshot_renewal_days IN (30, 90, 180, 365)),
  granted_reader_emails text[] DEFAULT ARRAY[]::text[] NOT NULL CHECK (cardinality(granted_reader_emails) <= 40),
  deleted_at timestamp with time zone,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.document_attachments OWNER TO postgres;

COMMENT ON TABLE public.document_attachments IS 'Materialized GPO-style document attachments across organization, team, equipment, and work_order scopes (#1422).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_attachments_active_unique
  ON public.document_attachments USING btree (document_id, scope_type, scope_id)
  WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_document_attachments_scope_lookup
  ON public.document_attachments USING btree (organization_id, scope_type, scope_id)
  WHERE (deleted_at IS NULL);

CREATE TABLE IF NOT EXISTS public.document_signoffs (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.organization_documents(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('affirm', 'replace')),
  previous_file_id text,
  new_file_id text NOT NULL,
  notes text,
  signed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  signed_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.document_signoffs OWNER TO postgres;

COMMENT ON TABLE public.document_signoffs IS 'Audit trail of organization admin renewal sign-offs (affirm or replace) on canonical organization documents (#1422).';

CREATE INDEX IF NOT EXISTS idx_document_signoffs_document_id
  ON public.document_signoffs USING btree (document_id, signed_at DESC);

CREATE TABLE IF NOT EXISTS public.work_order_drive_folders (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE UNIQUE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  folder_id text NOT NULL,
  folder_name text NOT NULL,
  web_view_link text,
  granted_writer_emails text[] DEFAULT ARRAY[]::text[] NOT NULL CHECK (cardinality(granted_writer_emails) <= 40),
  lifecycle_state text DEFAULT 'active'::text NOT NULL CHECK (
    lifecycle_state IN ('active', 'demoted_readers', 'deleted_empty')
  ),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.work_order_drive_folders OWNER TO postgres;

COMMENT ON TABLE public.work_order_drive_folders IS 'Tracks Google Drive folders created on Submitted -> Accepted work order transitions and their creation-time Writer ACL grants (#1422).';

CREATE INDEX IF NOT EXISTS idx_work_order_drive_folders_equipment_id
  ON public.work_order_drive_folders USING btree (organization_id, equipment_id);

ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_drive_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_documents_select
  ON public.organization_documents
  FOR SELECT
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY organization_documents_insert
  ON public.organization_documents
  FOR INSERT
  WITH CHECK (
    public.is_org_member((SELECT auth.uid() AS uid), organization_id)
    AND created_by = (SELECT auth.uid() AS uid)
  );

CREATE POLICY organization_documents_update
  ON public.organization_documents
  FOR UPDATE
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id))
  WITH CHECK (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY organization_documents_delete
  ON public.organization_documents
  FOR DELETE
  USING (public.is_org_operational_admin((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY document_attachments_select
  ON public.document_attachments
  FOR SELECT
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY document_attachments_insert
  ON public.document_attachments
  FOR INSERT
  WITH CHECK (
    public.is_org_member((SELECT auth.uid() AS uid), organization_id)
    AND created_by = (SELECT auth.uid() AS uid)
  );

CREATE POLICY document_attachments_update
  ON public.document_attachments
  FOR UPDATE
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id))
  WITH CHECK (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY document_attachments_delete
  ON public.document_attachments
  FOR DELETE
  USING (public.is_org_operational_admin((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY document_signoffs_select
  ON public.document_signoffs
  FOR SELECT
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY document_signoffs_insert
  ON public.document_signoffs
  FOR INSERT
  WITH CHECK (
    public.is_org_operational_admin((SELECT auth.uid() AS uid), organization_id)
    AND signed_by = (SELECT auth.uid() AS uid)
  );

CREATE POLICY work_order_drive_folders_select
  ON public.work_order_drive_folders
  FOR SELECT
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY work_order_drive_folders_insert
  ON public.work_order_drive_folders
  FOR INSERT
  WITH CHECK (
    public.is_org_member((SELECT auth.uid() AS uid), organization_id)
    AND created_by = (SELECT auth.uid() AS uid)
  );

CREATE POLICY work_order_drive_folders_update
  ON public.work_order_drive_folders
  FOR UPDATE
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id))
  WITH CHECK (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE OR REPLACE FUNCTION public.check_equipment_rental_readiness(
  p_equipment_id uuid
) RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY INVOKER
  SET search_path TO 'public'
AS $$
DECLARE
  v_equipment public.equipment%ROWTYPE;
  v_match RECORD;
  v_effective_days integer;
  v_expires_at timestamp with time zone;
BEGIN
  SELECT *
  INTO v_equipment
  FROM public.equipment
  WHERE id = p_equipment_id;

  IF v_equipment.id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found: %', p_equipment_id;
  END IF;

  IF NOT public.is_org_member(auth.uid(), v_equipment.organization_id) THEN
    RAISE EXCEPTION 'Access denied to equipment organization';
  END IF;

  -- Precedence: equipment override/attachment -> team attachment -> organization attachment
  SELECT
    da.id AS attachment_id,
    da.scope_type,
    da.is_override,
    da.snapshot_renewal_days,
    od.id AS document_id,
    od.title,
    od.renewal_days,
    od.last_signed_at
  INTO v_match
  FROM public.document_attachments da
  JOIN public.organization_documents od
    ON od.id = da.document_id
  WHERE da.organization_id = v_equipment.organization_id
    AND da.deleted_at IS NULL
    AND od.deleted_at IS NULL
    AND od.superseded_at IS NULL
    AND od.document_type = 'rental_insurance'
    AND (
      (da.scope_type = 'equipment' AND da.scope_id = v_equipment.id)
      OR (v_equipment.team_id IS NOT NULL AND da.scope_type = 'team' AND da.scope_id = v_equipment.team_id)
      OR (da.scope_type = 'organization' AND da.scope_id = v_equipment.organization_id)
    )
  ORDER BY
    CASE da.scope_type
      WHEN 'equipment' THEN 1
      WHEN 'team' THEN 2
      WHEN 'organization' THEN 3
      ELSE 4
    END ASC,
    da.is_override DESC,
    da.created_at DESC
  LIMIT 1;

  IF v_match IS NULL OR v_match.document_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_ready', false,
      'reason', 'missing_rental_insurance',
      'document_id', NULL,
      'scope_type', NULL,
      'last_signed_at', NULL,
      'expires_at', NULL
    );
  END IF;

  IF v_match.last_signed_at IS NULL THEN
    RETURN jsonb_build_object(
      'is_ready', false,
      'reason', 'unsigned_rental_insurance',
      'document_id', v_match.document_id,
      'scope_type', v_match.scope_type,
      'last_signed_at', NULL,
      'expires_at', NULL
    );
  END IF;

  v_effective_days := COALESCE(v_match.snapshot_renewal_days, v_match.renewal_days, 365);
  v_expires_at := v_match.last_signed_at + make_interval(days => v_effective_days);

  IF v_expires_at < now() THEN
    RETURN jsonb_build_object(
      'is_ready', false,
      'reason', 'expired_rental_insurance',
      'document_id', v_match.document_id,
      'scope_type', v_match.scope_type,
      'last_signed_at', v_match.last_signed_at,
      'expires_at', v_expires_at
    );
  END IF;

  RETURN jsonb_build_object(
    'is_ready', true,
    'reason', 'ready',
    'document_id', v_match.document_id,
    'scope_type', v_match.scope_type,
    'last_signed_at', v_match.last_signed_at,
    'expires_at', v_expires_at
  );
END;
$$;

ALTER FUNCTION public.check_equipment_rental_readiness(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.check_equipment_rental_readiness(uuid) IS 'Pure database rental readiness check against materialized document_attachments and canonical organization_documents.last_signed_at (#1422).';

REVOKE ALL ON FUNCTION public.check_equipment_rental_readiness(uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_equipment_rental_readiness(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_equipment_rental_readiness(uuid) TO service_role;

GRANT ALL ON TABLE public.organization_documents TO anon;
GRANT ALL ON TABLE public.organization_documents TO authenticated;
GRANT ALL ON TABLE public.organization_documents TO service_role;

GRANT ALL ON TABLE public.document_attachments TO anon;
GRANT ALL ON TABLE public.document_attachments TO authenticated;
GRANT ALL ON TABLE public.document_attachments TO service_role;

GRANT ALL ON TABLE public.document_signoffs TO anon;
GRANT ALL ON TABLE public.document_signoffs TO authenticated;
GRANT ALL ON TABLE public.document_signoffs TO service_role;

GRANT ALL ON TABLE public.work_order_drive_folders TO anon;
GRANT ALL ON TABLE public.work_order_drive_folders TO authenticated;
GRANT ALL ON TABLE public.work_order_drive_folders TO service_role;
