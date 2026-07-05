-- Migration: Sync equipment.last_known_location from scan GPS inserts
--
-- Scan inserts already write equipment_location_history via log_scan_location_history.
-- Work-order and equipment mini maps read equipment.last_known_location, so keep it
-- in sync when privacy-preserving scan GPS is stored on public.scans.

CREATE OR REPLACE FUNCTION public.sync_equipment_last_known_location_from_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF NEW.location IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_lat := NULLIF(trim(split_part(NEW.location, ',', 1)), '')::double precision;
    v_lng := NULLIF(trim(split_part(NEW.location, ',', 2)), '')::double precision;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180 THEN
    RETURN NEW;
  END IF;

  UPDATE public.equipment
  SET last_known_location = jsonb_build_object(
    'latitude', v_lat,
    'longitude', v_lng,
    'updated_at', NEW.scanned_at
  )
  WHERE id = NEW.equipment_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_equipment_last_known_location_from_scan ON public.scans;
CREATE TRIGGER trg_sync_equipment_last_known_location_from_scan
  AFTER INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_last_known_location_from_scan();

-- Backfill last_known_location from the latest GPS scan per equipment.
UPDATE public.equipment e
SET last_known_location = sub.lkl
FROM (
  SELECT DISTINCT ON (s.equipment_id)
    s.equipment_id,
    jsonb_build_object(
      'latitude', coords.v_lat,
      'longitude', coords.v_lng,
      'updated_at', s.scanned_at
    ) AS lkl
  FROM public.scans s
  CROSS JOIN LATERAL (
    SELECT
      NULLIF(trim(split_part(s.location, ',', 1)), '')::double precision AS v_lat,
      NULLIF(trim(split_part(s.location, ',', 2)), '')::double precision AS v_lng
  ) coords
  WHERE s.location IS NOT NULL
    AND coords.v_lat IS NOT NULL
    AND coords.v_lng IS NOT NULL
    AND coords.v_lat >= -90
    AND coords.v_lat <= 90
    AND coords.v_lng >= -180
    AND coords.v_lng <= 180
  ORDER BY s.equipment_id, s.scanned_at DESC
) sub
WHERE e.id = sub.equipment_id
  AND (
    e.last_known_location IS NULL
    OR e.last_known_location = 'null'::jsonb
    OR NOT (e.last_known_location ? 'latitude')
    OR NOT (e.last_known_location ? 'longitude')
  );
