-- Migration: Add location address columns and override flag to teams
--
-- Adds structured address fields (street, city, state, country) and
-- lat/lng coordinates to teams. Also adds override_equipment_location
-- flag to allow a team's location to override its equipment's locations.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS location_address text,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_state text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS override_equipment_location boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.teams.location_address IS 'Street address for the team location';
COMMENT ON COLUMN public.teams.location_city IS 'City for the team location';
COMMENT ON COLUMN public.teams.location_state IS 'State/province for the team location';
COMMENT ON COLUMN public.teams.location_country IS 'Country for the team location';
COMMENT ON COLUMN public.teams.location_lat IS 'Latitude coordinate for the team location (from geocoding or manual entry)';
COMMENT ON COLUMN public.teams.location_lng IS 'Longitude coordinate for the team location (from geocoding or manual entry)';
COMMENT ON COLUMN public.teams.override_equipment_location
  IS 'When true, all equipment assigned to this team uses the team location as its effective location';
