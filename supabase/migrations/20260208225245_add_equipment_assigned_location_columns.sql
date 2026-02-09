-- Migration: Add structured assigned location columns to equipment
--
-- Adds manual address fields (street, city, state, country) and lat/lng
-- coordinates separate from the existing location (text) and
-- last_known_location (jsonb, from scans) fields.
-- Also adds use_team_location flag for hierarchy resolution.

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS assigned_location_street text,
  ADD COLUMN IF NOT EXISTS assigned_location_city text,
  ADD COLUMN IF NOT EXISTS assigned_location_state text,
  ADD COLUMN IF NOT EXISTS assigned_location_country text,
  ADD COLUMN IF NOT EXISTS assigned_location_lat double precision,
  ADD COLUMN IF NOT EXISTS assigned_location_lng double precision,
  ADD COLUMN IF NOT EXISTS use_team_location boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.equipment.assigned_location_street IS 'Manually assigned street address';
COMMENT ON COLUMN public.equipment.assigned_location_city IS 'Manually assigned city';
COMMENT ON COLUMN public.equipment.assigned_location_state IS 'Manually assigned state/province';
COMMENT ON COLUMN public.equipment.assigned_location_country IS 'Manually assigned country';
COMMENT ON COLUMN public.equipment.assigned_location_lat IS 'Latitude from geocoded manual address';
COMMENT ON COLUMN public.equipment.assigned_location_lng IS 'Longitude from geocoded manual address';
COMMENT ON COLUMN public.equipment.use_team_location
  IS 'When true, this equipment defers to its team location if the team has override_equipment_location enabled';
