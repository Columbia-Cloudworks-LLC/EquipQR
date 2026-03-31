-- Migration: Extend scan location privacy to honour per-user limit_sensitive_pi
--
-- The existing trigger enforce_scan_location_privacy() only checks the org-level
-- toggle. This replaces it to also strip GPS when the scanning user has opted out
-- of Sensitive PI collection (profiles.limit_sensitive_pi = true).

CREATE OR REPLACE FUNCTION public.enforce_scan_location_privacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.equipment e
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE e.id = NEW.equipment_id
        AND o.scan_location_collection_enabled = false
    ) THEN
      NEW.location := NULL;
      RETURN NEW;
    END IF;

    IF NEW.scanned_by IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = NEW.scanned_by
        AND p.limit_sensitive_pi = true
    ) THEN
      NEW.location := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
