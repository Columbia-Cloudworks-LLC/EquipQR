-- Persist machine hours captured on work order and equipment notes (labor uses hours_worked).

ALTER TABLE public.work_order_notes
  ADD COLUMN IF NOT EXISTS machine_hours numeric(10,2);

ALTER TABLE public.equipment_notes
  ADD COLUMN IF NOT EXISTS machine_hours numeric(10,2);

COMMENT ON COLUMN public.work_order_notes.machine_hours IS 'Equipment meter / machine hours recorded with this note (optional).';
COMMENT ON COLUMN public.equipment_notes.machine_hours IS 'Equipment meter / machine hours recorded with this note (optional).';
