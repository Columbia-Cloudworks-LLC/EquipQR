-- Migration: Add structured geo locations for inventory parts and org defaults
--
-- inventory_items.location remains the user-facing Location Name nickname.
-- Structured address/coordinate columns on inventory_items override the
-- organization inventory default when populated.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS inventory_default_location_name text,
  ADD COLUMN IF NOT EXISTS inventory_default_location_address text,
  ADD COLUMN IF NOT EXISTS inventory_default_location_city text,
  ADD COLUMN IF NOT EXISTS inventory_default_location_state text,
  ADD COLUMN IF NOT EXISTS inventory_default_location_country text,
  ADD COLUMN IF NOT EXISTS inventory_default_location_lat double precision,
  ADD COLUMN IF NOT EXISTS inventory_default_location_lng double precision;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS location_address text,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_state text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision;

COMMENT ON COLUMN public.organizations.inventory_default_location_name IS
  'Optional nickname for the organization-wide inventory storage default (e.g. Main Shop).';
COMMENT ON COLUMN public.organizations.inventory_default_location_address IS
  'Street address for the organization inventory default storage location.';
COMMENT ON COLUMN public.organizations.inventory_default_location_city IS
  'City for the organization inventory default storage location.';
COMMENT ON COLUMN public.organizations.inventory_default_location_state IS
  'State/province for the organization inventory default storage location.';
COMMENT ON COLUMN public.organizations.inventory_default_location_country IS
  'Country for the organization inventory default storage location.';
COMMENT ON COLUMN public.organizations.inventory_default_location_lat IS
  'Latitude for the organization inventory default storage location.';
COMMENT ON COLUMN public.organizations.inventory_default_location_lng IS
  'Longitude for the organization inventory default storage location.';

COMMENT ON COLUMN public.inventory_items.location IS
  'User-facing Location Name nickname (e.g. Shelf A, Truck 3). Not used for geo resolution.';
COMMENT ON COLUMN public.inventory_items.location_address IS
  'Part-specific storage street address; overrides organization inventory default when set.';
COMMENT ON COLUMN public.inventory_items.location_city IS
  'Part-specific storage city; overrides organization inventory default when set.';
COMMENT ON COLUMN public.inventory_items.location_state IS
  'Part-specific storage state/province; overrides organization inventory default when set.';
COMMENT ON COLUMN public.inventory_items.location_country IS
  'Part-specific storage country; overrides organization inventory default when set.';
COMMENT ON COLUMN public.inventory_items.location_lat IS
  'Part-specific storage latitude; overrides organization inventory default when set.';
COMMENT ON COLUMN public.inventory_items.location_lng IS
  'Part-specific storage longitude; overrides organization inventory default when set.';
