-- Add import_id column to equipment table for tracking CSV imports
ALTER TABLE public.equipment 
ADD COLUMN import_id text;

-- Create index for efficient filtering by import_id
CREATE INDEX idx_equipment_import_id ON public.equipment(import_id) WHERE import_id IS NOT NULL;