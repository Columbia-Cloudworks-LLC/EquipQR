-- Add link to the work order that set last maintenance
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS last_maintenance_work_order_id uuid;

ALTER TABLE public.equipment
ADD CONSTRAINT equipment_last_maintenance_work_order_id_fkey
FOREIGN KEY (last_maintenance_work_order_id)
REFERENCES public.work_orders (id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_last_maintenance_work_order_id
  ON public.equipment (last_maintenance_work_order_id);

-- Sync equipment.last_maintenance when PM work orders are completed
CREATE OR REPLACE FUNCTION public.sync_equipment_last_maintenance_from_work_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_date date;
  v_existing date;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.equipment_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.has_pm IS TRUE OR NEW.pm_required IS TRUE THEN
      IF NEW.completed_date IS NULL THEN
        RETURN NEW;
      END IF;

      v_completed_date := NEW.completed_date::date;

      SELECT last_maintenance
      INTO v_existing
      FROM public.equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;

      IF v_existing IS NULL OR v_completed_date > v_existing THEN
        UPDATE public.equipment
        SET last_maintenance = v_completed_date,
            last_maintenance_work_order_id = NEW.id,
            updated_at = now()
        WHERE id = NEW.equipment_id
          AND organization_id = NEW.organization_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_equipment_last_maintenance ON public.work_orders;

CREATE TRIGGER tr_sync_equipment_last_maintenance
AFTER UPDATE OF status, completed_date ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_equipment_last_maintenance_from_work_order();
