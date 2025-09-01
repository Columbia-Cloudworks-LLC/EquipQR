
-- Restrict reading global PM templates to authenticated users only
-- and keep org templates visible to org members.

-- Drop the broad existing policy if it exists
DROP POLICY IF EXISTS "read org/global templates" ON public.pm_checklist_templates;

-- Authenticated users (or service role) can read GLOBAL templates
CREATE POLICY "authenticated_can_read_global_templates"
  ON public.pm_checklist_templates
  FOR SELECT
  USING (
    organization_id IS NULL
    AND (
      auth.uid() IS NOT NULL
      OR auth.role() = 'service_role'
    )
  );

-- Organization members (or service role) can read ORG templates
CREATE POLICY "members_can_read_org_templates"
  ON public.pm_checklist_templates
  FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND (
      is_org_member(auth.uid(), organization_id)
      OR auth.role() = 'service_role'
    )
  );
