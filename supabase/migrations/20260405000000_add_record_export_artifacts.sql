-- Migration: add record_export_artifacts table
-- Purpose: track the last-exported document per record so re-export can
--          replace the previous artifact and users can quickly re-open it.
--          Schema is record-type-agnostic; v1 behavior covers work orders only.

CREATE TABLE IF NOT EXISTS public.record_export_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What was exported
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  export_channel text NOT NULL,
  artifact_kind text NOT NULL,

  -- Where the artifact lives
  provider text NOT NULL DEFAULT 'google_drive',
  provider_file_id text NOT NULL,
  web_view_link text NOT NULL,
  provider_parent_id text,

  -- Lifecycle
  last_exported_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_exported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'replaced', 'deleted')),
  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT record_export_artifacts_unique
    UNIQUE (organization_id, record_type, record_id, export_channel, artifact_kind)
);

CREATE INDEX IF NOT EXISTS idx_record_export_artifacts_org
  ON public.record_export_artifacts (organization_id);

CREATE INDEX IF NOT EXISTS idx_record_export_artifacts_record
  ON public.record_export_artifacts (record_type, record_id);

DROP TRIGGER IF EXISTS trg_record_export_artifacts_updated_at
  ON public.record_export_artifacts;
CREATE TRIGGER trg_record_export_artifacts_updated_at
  BEFORE UPDATE ON public.record_export_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.record_export_artifacts ENABLE ROW LEVEL SECURITY;

-- SELECT: any active org member can see artifacts (needed for "Open last doc" link)
DROP POLICY IF EXISTS record_export_artifacts_select ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_select
  ON public.record_export_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- INSERT: owner/admin only (exports are admin-gated)
DROP POLICY IF EXISTS record_export_artifacts_insert ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_insert
  ON public.record_export_artifacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- UPDATE: owner/admin only
DROP POLICY IF EXISTS record_export_artifacts_update ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_update
  ON public.record_export_artifacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- DELETE: owner/admin only
DROP POLICY IF EXISTS record_export_artifacts_delete ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_delete
  ON public.record_export_artifacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- Service role full access (for edge functions using admin client)
DROP POLICY IF EXISTS record_export_artifacts_service ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_service
  ON public.record_export_artifacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.record_export_artifacts IS
  'Tracks the most recent exported document per record, enabling replace-on-re-export '
  'and quick "Open last doc" access. Schema supports any record type; v1 covers work orders.';
