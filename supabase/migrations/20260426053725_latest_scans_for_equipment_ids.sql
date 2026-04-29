-- Bound fleet-map scan lookups to one latest location-bearing scan per equipment.

CREATE INDEX IF NOT EXISTS idx_scans_equipment_latest_location
ON public.scans (equipment_id, scanned_at DESC)
WHERE location IS NOT NULL;

CREATE OR REPLACE FUNCTION public.latest_scans_for_equipment_ids(
  p_organization_id uuid,
  p_equipment_ids uuid[]
)
RETURNS TABLE (
  equipment_id uuid,
  location text,
  scanned_at timestamp with time zone
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (s.equipment_id)
    s.equipment_id,
    s.location,
    s.scanned_at
  FROM public.scans s
  JOIN public.equipment e ON e.id = s.equipment_id
  WHERE e.organization_id = p_organization_id
    AND s.equipment_id = ANY(COALESCE(p_equipment_ids, ARRAY[]::uuid[]))
    AND s.location IS NOT NULL
  ORDER BY s.equipment_id, s.scanned_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.latest_scans_for_equipment_ids(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.latest_scans_for_equipment_ids(uuid, uuid[])
IS 'Returns the latest location-bearing scan for each supplied equipment id within the requested organization, bounded to one row per equipment.';
