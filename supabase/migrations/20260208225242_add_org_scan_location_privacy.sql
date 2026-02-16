-- Migration: Add scan location collection privacy setting to organizations
--
-- Adds an organization-level toggle to enable/disable GPS coordinate capture
-- during QR code scans. When disabled, scan records will not include location data.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS scan_location_collection_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organizations.scan_location_collection_enabled
  IS 'When false, QR scans will not capture or store GPS coordinates';
