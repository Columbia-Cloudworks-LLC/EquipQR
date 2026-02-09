-- Migration: Create equipment_location_history table
--
-- Tracks every location change for equipment with source attribution.
-- Sources: 'scan' (QR scan GPS), 'manual' (user-entered address),
--          'team_sync' (inherited from team override), 'quickbooks' (from QBO customer).

CREATE TABLE IF NOT EXISTS public.equipment_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('scan', 'manual', 'team_sync', 'quickbooks')),
  latitude double precision,
  longitude double precision,
  address_street text,
  address_city text,
  address_state text,
  address_country text,
  formatted_address text,
  changed_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups by equipment (most recent first)
CREATE INDEX IF NOT EXISTS idx_equip_loc_history_equipment
  ON public.equipment_location_history(equipment_id, created_at DESC);

-- Index for filtering by source type
CREATE INDEX IF NOT EXISTS idx_equip_loc_history_source
  ON public.equipment_location_history(source);

-- Index the FK column for cascade delete performance
CREATE INDEX IF NOT EXISTS idx_equip_loc_history_changed_by
  ON public.equipment_location_history(changed_by);

-- Enable RLS
ALTER TABLE public.equipment_location_history ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can view history for equipment in their org
DROP POLICY IF EXISTS equipment_location_history_select ON public.equipment_location_history;
CREATE POLICY equipment_location_history_select
  ON public.equipment_location_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = equipment_location_history.equipment_id
        AND om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );

-- INSERT: no direct inserts via RLS; writes happen through SECURITY DEFINER triggers/RPCs
DROP POLICY IF EXISTS equipment_location_history_service_insert ON public.equipment_location_history;
CREATE POLICY equipment_location_history_service_insert
  ON public.equipment_location_history
  FOR INSERT WITH CHECK (false);
