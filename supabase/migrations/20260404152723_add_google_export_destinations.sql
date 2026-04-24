CREATE TABLE IF NOT EXISTS public.organization_google_export_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('work-orders-internal-packet')),
  selection_kind text NOT NULL CHECK (selection_kind IN ('folder', 'shared_drive')),
  drive_id text,
  parent_id text NOT NULL,
  display_name text NOT NULL,
  web_view_link text,
  configured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT organization_google_export_destinations_org_doc_unique UNIQUE (organization_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_google_export_destinations_organization_id
  ON public.organization_google_export_destinations (organization_id);

CREATE INDEX IF NOT EXISTS idx_google_export_destinations_document_type
  ON public.organization_google_export_destinations (document_type);

DROP TRIGGER IF EXISTS trg_google_export_destinations_updated_at ON public.organization_google_export_destinations;
CREATE TRIGGER trg_google_export_destinations_updated_at
  BEFORE UPDATE ON public.organization_google_export_destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.organization_google_export_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS google_export_destinations_select ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_select
  ON public.organization_google_export_destinations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS google_export_destinations_insert ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_insert
  ON public.organization_google_export_destinations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS google_export_destinations_update ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_update
  ON public.organization_google_export_destinations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS google_export_destinations_delete ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_delete
  ON public.organization_google_export_destinations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE public.organization_google_export_destinations IS
  'Organization-managed destinations for Google document exports (including shared drives).';
