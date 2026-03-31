-- Migration: Add per-user Sensitive PI opt-out flag to profiles
--
-- CPRA Right to Limit Use of Sensitive Personal Information (Cal. Civ. Code
-- section 1798.121). When true, the user opts out of GPS data collection on
-- their scans regardless of the organization-level setting.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS limit_sensitive_pi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.limit_sensitive_pi IS
  'When true, GPS coordinates are suppressed for this user''s scans even if the '
  'organization has scan_location_collection_enabled = true. Implements CPRA '
  'Right to Limit Use of Sensitive Personal Information.';
