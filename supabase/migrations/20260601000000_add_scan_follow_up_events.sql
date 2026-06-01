-- Migration: Add scan_follow_up_events
--
-- Records the structured follow-up actions a user performs from a single QR
-- scan session (open dashboard record, create work order, update hours, add
-- note/image). Each row is attributed to the originating scan so the equipment
-- Scan History timeline can show who scanned, when, where, and what they did.
--
-- This table is immutable follow-up attribution for QR scan sessions. It is NOT
-- a replacement for public.audit_log (field-level CRUD compliance history) and
-- does NOT store sensitive note content or raw image bytes.
--
-- Down migration (manual): DROP TABLE public.scan_follow_up_events;

BEGIN;

CREATE TABLE IF NOT EXISTS public.scan_follow_up_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'dashboard_opened',
    'pm_work_order_created',
    'generic_work_order_created',
    'working_hours_updated',
    'note_image_added'
  )),
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid NOT NULL REFERENCES public.profiles(id),
  performed_by_name text,
  performed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scan_follow_up_events IS
  'Immutable follow-up actions performed from a single QR scan session (work order, hours, note, dashboard open). Anchors the equipment Scan History timeline; not a replacement for audit_log.';
COMMENT ON COLUMN public.scan_follow_up_events.scan_id IS
  'The scan that this follow-up action originated from.';
COMMENT ON COLUMN public.scan_follow_up_events.event_type IS
  'Action category: dashboard_opened, pm_work_order_created, generic_work_order_created, working_hours_updated, note_image_added.';
COMMENT ON COLUMN public.scan_follow_up_events.entity_type IS
  'Optional downstream entity type (e.g. work_order, note) the action produced.';
COMMENT ON COLUMN public.scan_follow_up_events.entity_id IS
  'Optional downstream entity id the action produced.';
COMMENT ON COLUMN public.scan_follow_up_events.metadata IS
  'Minimal non-sensitive context (work order title/id, hours value, image count, is_private). Never stores note content.';
COMMENT ON COLUMN public.scan_follow_up_events.performed_by_name IS
  'Denormalized performer name preserved on account deletion (mirrors scans.scanned_by_name).';

-- Index for timeline reads (per equipment, newest first)
CREATE INDEX IF NOT EXISTS idx_scan_follow_up_events_equipment_performed_at
  ON public.scan_follow_up_events(equipment_id, performed_at DESC);

-- Index for grouping events under their parent scan
CREATE INDEX IF NOT EXISTS idx_scan_follow_up_events_scan_id
  ON public.scan_follow_up_events(scan_id);

-- Index the performer FK for cascade / departure-denormalization performance
CREATE INDEX IF NOT EXISTS idx_scan_follow_up_events_performed_by
  ON public.scan_follow_up_events(performed_by);

-- Enable RLS immediately
ALTER TABLE public.scan_follow_up_events ENABLE ROW LEVEL SECURITY;

-- SELECT: active org members can read events for equipment in their org
DROP POLICY IF EXISTS scan_follow_up_events_select_organization_members ON public.scan_follow_up_events;
CREATE POLICY scan_follow_up_events_select_organization_members
  ON public.scan_follow_up_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = scan_follow_up_events.equipment_id
        AND om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );

-- INSERT: active org members may insert events only for themselves, where the
-- scan and equipment belong to their org and the scan matches the equipment.
DROP POLICY IF EXISTS scan_follow_up_events_insert_organization_members ON public.scan_follow_up_events;
CREATE POLICY scan_follow_up_events_insert_organization_members
  ON public.scan_follow_up_events
  FOR INSERT WITH CHECK (
    performed_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.equipment e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = scan_follow_up_events.equipment_id
        AND om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = scan_follow_up_events.scan_id
        AND s.equipment_id = scan_follow_up_events.equipment_id
    )
  );

-- No UPDATE or DELETE policies: rows are immutable; cleanup happens via the
-- ON DELETE CASCADE from scans / equipment.

COMMIT;
