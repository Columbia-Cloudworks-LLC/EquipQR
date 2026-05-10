-- Issue #726: primary visual pointer for work orders (first creation photo).
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS primary_image_id uuid NULL;

COMMENT ON COLUMN public.work_orders.primary_image_id IS
  'Optional pointer to work_order_images; the first photo uploaded during work order creation is set automatically as the primary visual evidence.';

CREATE INDEX IF NOT EXISTS idx_work_orders_primary_image_id
  ON public.work_orders (primary_image_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_orders_primary_image_id_fkey'
      AND conrelid = 'public.work_orders'::regclass
  ) THEN
    ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_primary_image_id_fkey
      FOREIGN KEY (primary_image_id)
      REFERENCES public.work_order_images (id)
      ON DELETE SET NULL;
  END IF;
END $$;
