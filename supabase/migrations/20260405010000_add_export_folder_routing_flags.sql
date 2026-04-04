-- Migration: add subfolder routing toggles to export destinations
-- Purpose: let each organization independently enable/disable team and equipment
--          subfolder organization for Google Docs exports.

ALTER TABLE public.organization_google_export_destinations
  ADD COLUMN IF NOT EXISTS folder_by_team boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS folder_by_equipment boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organization_google_export_destinations.folder_by_team IS
  'When true, exports are organized into a subfolder named after the work order team.';
COMMENT ON COLUMN public.organization_google_export_destinations.folder_by_equipment IS
  'When true, exports are organized into a subfolder named after the work order equipment.';
