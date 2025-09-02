
-- Create preventative_maintenance table
CREATE TABLE public.preventative_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  checklist_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  CONSTRAINT fk_pm_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Add RLS policies for preventative_maintenance
ALTER TABLE public.preventative_maintenance ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view PM records for their organization's equipment
CREATE POLICY "Users can view PM for their organization" 
  ON public.preventative_maintenance 
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Policy to allow users to create PM records for their organization
CREATE POLICY "Users can create PM for their organization" 
  ON public.preventative_maintenance 
  FOR INSERT 
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Policy to allow users to update PM records for their organization
CREATE POLICY "Users can update PM for their organization" 
  ON public.preventative_maintenance 
  FOR UPDATE 
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Add PM flag to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN has_pm BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN pm_required BOOLEAN NOT NULL DEFAULT false;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pm_updated_at
  BEFORE UPDATE ON public.preventative_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_updated_at();

-- Create function to get latest completed PM for equipment
CREATE OR REPLACE FUNCTION get_latest_completed_pm(equipment_uuid uuid)
RETURNS TABLE(
  id uuid,
  work_order_id uuid,
  completed_at timestamp with time zone,
  completed_by uuid,
  work_order_title text
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    pm.id,
    pm.work_order_id,
    pm.completed_at,
    pm.completed_by,
    wo.title as work_order_title
  FROM preventative_maintenance pm
  JOIN work_orders wo ON pm.work_order_id = wo.id
  WHERE pm.equipment_id = equipment_uuid 
    AND pm.status = 'completed'
    AND pm.completed_at IS NOT NULL
  ORDER BY pm.completed_at DESC
  LIMIT 1;
$function$;
