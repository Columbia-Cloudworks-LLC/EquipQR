-- Add default_pm_template_id column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN default_pm_template_id uuid REFERENCES public.pm_checklist_templates(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_equipment_default_pm_template ON public.equipment(default_pm_template_id);

-- Update RLS policies to allow organization admins to manage template assignments
-- (The existing policies should already cover this, but let's ensure equipment updates are allowed for admins)