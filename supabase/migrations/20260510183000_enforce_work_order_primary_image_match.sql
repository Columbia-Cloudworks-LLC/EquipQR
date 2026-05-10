-- Enforce that work_orders.primary_image_id points to an image on the same work order.
CREATE OR REPLACE FUNCTION public.enforce_work_order_primary_image_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.primary_image_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.work_order_images image
    WHERE image.id = NEW.primary_image_id
      AND image.work_order_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'primary_image_id must reference an image attached to the same work order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_work_order_primary_image_match_trigger
  ON public.work_orders;

CREATE TRIGGER enforce_work_order_primary_image_match_trigger
  BEFORE INSERT OR UPDATE OF primary_image_id ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_work_order_primary_image_match();

COMMENT ON FUNCTION public.enforce_work_order_primary_image_match() IS
  'Validates work_orders.primary_image_id so it can only point at a work_order_images row for the same work order.';
