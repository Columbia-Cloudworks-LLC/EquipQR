-- Default QR scan location collection to opt-in for new organizations.
ALTER TABLE public.organizations
  ALTER COLUMN scan_location_collection_enabled SET DEFAULT false;

COMMENT ON COLUMN public.organizations.scan_location_collection_enabled
IS 'Controls whether QR scans capture GPS coordinates for this organization. Defaults to false for privacy-by-default.';
