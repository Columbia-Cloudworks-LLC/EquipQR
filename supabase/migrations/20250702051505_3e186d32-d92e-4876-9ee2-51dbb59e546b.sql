
-- Create work_order_costs table to store itemized costs
CREATE TABLE public.work_order_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  total_price_cents integer GENERATED ALWAYS AS (ROUND(quantity * unit_price_cents)) STORED,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on work_order_costs
ALTER TABLE public.work_order_costs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for work_order_costs
-- Users can view costs if they have access to the work order and appropriate permissions
CREATE POLICY "Users can view work order costs" 
ON public.work_order_costs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    WHERE wo.id = work_order_costs.work_order_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1
    FROM work_orders wo
    JOIN team_members tm ON wo.team_id = tm.team_id
    WHERE wo.id = work_order_costs.work_order_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('manager', 'technician')
  )
);

-- Users can insert costs if they can manage the work order
CREATE POLICY "Users can create work order costs" 
ON public.work_order_costs 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 
      FROM work_orders wo
      JOIN organization_members om ON wo.organization_id = om.organization_id
      WHERE wo.id = work_order_costs.work_order_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1
      FROM work_orders wo
      JOIN team_members tm ON wo.team_id = tm.team_id
      WHERE wo.id = work_order_costs.work_order_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('manager', 'technician')
    )
  )
);

-- Users can update costs they created or if they're admin
CREATE POLICY "Users can update work order costs" 
ON public.work_order_costs 
FOR UPDATE 
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    WHERE wo.id = work_order_costs.work_order_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin')
  )
);

-- Users can delete costs they created or if they're admin
CREATE POLICY "Users can delete work order costs" 
ON public.work_order_costs 
FOR DELETE 
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    WHERE wo.id = work_order_costs.work_order_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin')
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_work_order_costs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER work_order_costs_updated_at
  BEFORE UPDATE ON public.work_order_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_order_costs_updated_at();

-- Add index for performance
CREATE INDEX idx_work_order_costs_work_order_id ON public.work_order_costs(work_order_id);
