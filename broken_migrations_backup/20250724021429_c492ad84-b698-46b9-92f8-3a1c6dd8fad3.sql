-- Add working_hours column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN working_hours numeric DEFAULT 0;

-- Create equipment_working_hours_history table
CREATE TABLE public.equipment_working_hours_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL,
  old_hours numeric,
  new_hours numeric NOT NULL,
  hours_added numeric,
  updated_by uuid NOT NULL,
  updated_by_name text,
  update_source text NOT NULL DEFAULT 'manual', -- 'manual' or 'work_order'
  work_order_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment_working_hours_history ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment_working_hours_history
CREATE POLICY "Users can view working hours history for accessible equipment"
ON public.equipment_working_hours_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = equipment_working_hours_history.equipment_id
    AND (
      is_org_admin(auth.uid(), e.organization_id) 
      OR (
        is_org_member(auth.uid(), e.organization_id) 
        AND e.team_id IS NOT NULL 
        AND e.team_id IN (
          SELECT tm.team_id FROM public.team_members tm 
          WHERE tm.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can create working hours history for accessible equipment"
ON public.equipment_working_hours_history
FOR INSERT
WITH CHECK (
  updated_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = equipment_working_hours_history.equipment_id
    AND (
      is_org_admin(auth.uid(), e.organization_id) 
      OR (
        is_org_member(auth.uid(), e.organization_id) 
        AND e.team_id IS NOT NULL 
        AND e.team_id IN (
          SELECT tm.team_id FROM public.team_members tm 
          WHERE tm.user_id = auth.uid()
        )
      )
    )
  )
);

-- Create function to update equipment working hours with history
CREATE OR REPLACE FUNCTION public.update_equipment_working_hours(
  p_equipment_id uuid,
  p_new_hours numeric,
  p_update_source text DEFAULT 'manual',
  p_work_order_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_hours numeric;
  user_name text;
  org_id uuid;
  result jsonb;
BEGIN
  -- Get current hours and organization
  SELECT working_hours, organization_id INTO current_hours, org_id
  FROM equipment
  WHERE id = p_equipment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Equipment not found');
  END IF;
  
  -- Check permissions
  IF NOT (
    is_org_admin(auth.uid(), org_id) 
    OR (
      is_org_member(auth.uid(), org_id) 
      AND EXISTS (
        SELECT 1 FROM equipment e
        WHERE e.id = p_equipment_id
        AND e.team_id IS NOT NULL 
        AND e.team_id IN (
          SELECT tm.team_id FROM team_members tm 
          WHERE tm.user_id = auth.uid()
        )
      )
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Get user name
  SELECT name INTO user_name FROM profiles WHERE id = auth.uid();
  
  -- Update equipment working hours
  UPDATE equipment 
  SET 
    working_hours = p_new_hours,
    updated_at = now()
  WHERE id = p_equipment_id;
  
  -- Create history entry
  INSERT INTO equipment_working_hours_history (
    equipment_id,
    old_hours,
    new_hours,
    hours_added,
    updated_by,
    updated_by_name,
    update_source,
    work_order_id,
    notes
  ) VALUES (
    p_equipment_id,
    current_hours,
    p_new_hours,
    p_new_hours - COALESCE(current_hours, 0),
    auth.uid(),
    user_name,
    p_update_source,
    p_work_order_id,
    p_notes
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_hours', current_hours,
    'new_hours', p_new_hours,
    'hours_added', p_new_hours - COALESCE(current_hours, 0)
  );
END;
$$;