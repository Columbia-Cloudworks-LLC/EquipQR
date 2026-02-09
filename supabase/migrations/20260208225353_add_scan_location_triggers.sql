-- Migration: Add scan location triggers
--
-- 1. enforce_scan_location_privacy: strips GPS from scans when org has disabled collection
-- 2. log_scan_location_history: writes to equipment_location_history on each scan with location
-- 3. log_equipment_manual_location_history: writes to history when equipment assigned location changes

-- =============================================================================
-- Trigger 1: Enforce scan location privacy
-- Runs BEFORE INSERT on scans to nullify location if org has disabled collection.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_scan_location_privacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    -- Check if org has disabled scan location collection
    IF EXISTS (
      SELECT 1 FROM public.equipment e
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE e.id = NEW.equipment_id
        AND o.scan_location_collection_enabled = false
    ) THEN
      NEW.location := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_scan_location_privacy
  BEFORE INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_scan_location_privacy();

-- =============================================================================
-- Trigger 2: Log scan location to history
-- Runs AFTER INSERT on scans to record location in equipment_location_history.
-- Fires after the privacy trigger so only non-stripped locations are logged.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_scan_location_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF NEW.location IS NOT NULL THEN
    -- Parse "lat, lng" text format
    BEGIN
      v_lat := NULLIF(trim(split_part(NEW.location, ',', 1)), '')::double precision;
      v_lng := NULLIF(trim(split_part(NEW.location, ',', 2)), '')::double precision;
    EXCEPTION WHEN OTHERS THEN
      v_lat := NULL;
      v_lng := NULL;
    END;

    INSERT INTO public.equipment_location_history (
      equipment_id, source, formatted_address, changed_by, latitude, longitude
    ) VALUES (
      NEW.equipment_id, 'scan', NEW.location, NEW.scanned_by, v_lat, v_lng
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_scan_location_history
  AFTER INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION public.log_scan_location_history();

-- =============================================================================
-- RPC: Log manual/team_sync/quickbooks location changes
-- Called from the frontend when equipment or team location is updated.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_equipment_location_change(
  p_equipment_id uuid,
  p_source text,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_address_street text DEFAULT NULL,
  p_address_city text DEFAULT NULL,
  p_address_state text DEFAULT NULL,
  p_address_country text DEFAULT NULL,
  p_formatted_address text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_history_id uuid;
BEGIN
  -- Validate source
  IF p_source NOT IN ('scan', 'manual', 'team_sync', 'quickbooks') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- Verify caller has access to this equipment's org
  IF NOT EXISTS (
    SELECT 1 FROM public.equipment e
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = p_equipment_id
      AND om.user_id = (select auth.uid())
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the equipment organization';
  END IF;

  INSERT INTO public.equipment_location_history (
    equipment_id, source, latitude, longitude,
    address_street, address_city, address_state, address_country,
    formatted_address, changed_by, metadata
  ) VALUES (
    p_equipment_id, p_source, p_latitude, p_longitude,
    p_address_street, p_address_city, p_address_state, p_address_country,
    p_formatted_address, (select auth.uid()), p_metadata
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;
