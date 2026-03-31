-- Migration: DSR cockpit tenant scope, checklist state, and export metadata
BEGIN;

ALTER TABLE public.dsr_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checklist_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS required_checklist_steps text[] NOT NULL DEFAULT ARRAY[
    'verify_identity',
    'search_systems',
    'fulfill_request'
  ]::text[],
  ADD COLUMN IF NOT EXISTS export_artifacts jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.dsr_requests.organization_id IS
  'Organization scope for cockpit operations. Null indicates legacy requests not scoped to a tenant.';
COMMENT ON COLUMN public.dsr_requests.checklist_progress IS
  'JSON object keyed by step id containing completion metadata.';
COMMENT ON COLUMN public.dsr_requests.required_checklist_steps IS
  'Required steps that must be completed before a request can be marked completed.';
COMMENT ON COLUMN public.dsr_requests.export_artifacts IS
  'Immutable export metadata contract for evidence packet generation.';

CREATE INDEX IF NOT EXISTS idx_dsr_requests_org_status_due
  ON public.dsr_requests (organization_id, status, COALESCE(extended_due_at, due_at))
  WHERE status NOT IN ('completed', 'denied');

DROP POLICY IF EXISTS "org_admins_manage_dsr_requests" ON public.dsr_requests;
CREATE POLICY "org_admins_manage_dsr_requests"
  ON public.dsr_requests
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = dsr_requests.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "org_admins_manage_dsr_events" ON public.dsr_request_events;
CREATE POLICY "org_admins_manage_dsr_events"
  ON public.dsr_request_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dsr_requests dr
      JOIN public.organization_members om
        ON om.organization_id = dr.organization_id
      WHERE dr.id = dsr_request_events.dsr_request_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

ALTER TABLE public.dsr_request_events
  DROP CONSTRAINT IF EXISTS dsr_request_events_event_type_check;

ALTER TABLE public.dsr_request_events
  ADD CONSTRAINT dsr_request_events_event_type_check
  CHECK (event_type IN (
    'intake_received',
    'verification_challenge_sent',
    'verification_passed',
    'verification_failed',
    'processing_started',
    'fulfillment_step_completed',
    'checklist_step_completed',
    'extension_invoked',
    'denial_issued',
    'request_completed',
    'artifact_attached',
    'export_requested',
    'export_ready',
    'export_failed',
    'notice_sent',
    'notice_failed',
    'note_added'
  ));

COMMIT;
