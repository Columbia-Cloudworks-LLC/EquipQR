-- Migration: Backfill customers from existing QuickBooks team mappings
-- Also links teams.customer_id and propagates to equipment.customer_id.
-- Adds a trigger to keep equipment.customer_id in sync when teams.customer_id changes.

BEGIN;

-- ============================================
-- STEP 1: Create a customers row per distinct QB customer mapping
-- ============================================

INSERT INTO public.customers (
  name,
  organization_id,
  status,
  quickbooks_customer_id,
  quickbooks_display_name,
  quickbooks_synced_at
)
SELECT DISTINCT ON (qtc.organization_id, qtc.quickbooks_customer_id)
  qtc.display_name,
  qtc.organization_id,
  'active',
  qtc.quickbooks_customer_id,
  qtc.display_name,
  now()
FROM public.quickbooks_team_customers qtc
WHERE qtc.quickbooks_customer_id IS NOT NULL
ON CONFLICT (organization_id, quickbooks_customer_id)
  WHERE quickbooks_customer_id IS NOT NULL
DO NOTHING;

-- ============================================
-- STEP 2: Link teams.customer_id to the newly created customer rows
-- ============================================

UPDATE public.teams t
SET customer_id = c.id
FROM public.quickbooks_team_customers qtc
JOIN public.customers c
  ON c.quickbooks_customer_id = qtc.quickbooks_customer_id
  AND c.organization_id = qtc.organization_id
WHERE qtc.team_id = t.id
  AND qtc.organization_id = t.organization_id
  AND t.customer_id IS NULL;

-- ============================================
-- STEP 3: Propagate to equipment.customer_id where not already set
-- ============================================

UPDATE public.equipment e
SET customer_id = t.customer_id
FROM public.teams t
WHERE e.team_id = t.id
  AND t.customer_id IS NOT NULL
  AND e.customer_id IS NULL;

COMMIT;

-- ============================================
-- STEP 4: Trigger to keep equipment.customer_id in sync
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_equipment_customer_from_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    UPDATE public.equipment
    SET customer_id = NEW.customer_id
    WHERE team_id = NEW.id
      AND (customer_id IS NULL OR customer_id = OLD.customer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_equipment_customer ON public.teams;
CREATE TRIGGER trigger_sync_equipment_customer
  AFTER UPDATE OF customer_id ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_customer_from_team();
