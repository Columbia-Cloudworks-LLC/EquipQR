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
        AND om.role IN ('owner', 'admin')
    )
  );
