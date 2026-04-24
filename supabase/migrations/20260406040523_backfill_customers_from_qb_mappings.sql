BEGIN;

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
ORDER BY qtc.organization_id, qtc.quickbooks_customer_id, qtc.updated_at DESC
ON CONFLICT (organization_id, quickbooks_customer_id)
  WHERE quickbooks_customer_id IS NOT NULL
DO NOTHING;

UPDATE public.teams t
SET customer_id = c.id
FROM public.quickbooks_team_customers qtc
JOIN public.customers c
  ON c.quickbooks_customer_id = qtc.quickbooks_customer_id
  AND c.organization_id = qtc.organization_id
WHERE qtc.team_id = t.id
  AND qtc.organization_id = t.organization_id
  AND t.customer_id IS NULL;

UPDATE public.equipment e
SET customer_id = t.customer_id
FROM public.teams t
WHERE e.team_id = t.id
  AND t.customer_id IS NOT NULL
  AND e.customer_id IS NULL;

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

COMMIT;
