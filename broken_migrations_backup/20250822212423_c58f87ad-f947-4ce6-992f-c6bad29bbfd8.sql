-- Create baseline work_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  equipment_id uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'submitted',
  assignee_id uuid,
  assignee_name text,
  team_id uuid,
  created_by uuid NOT NULL,
  created_by_name text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone,
  estimated_hours numeric,
  completed_date timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT work_orders_priority_check CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT work_orders_status_check CHECK (status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view work orders for their organization" 
ON public.work_orders 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Users can create work orders for their organization" 
ON public.work_orders 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can update work orders for their organization" 
ON public.work_orders 
FOR UPDATE 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_id ON public.work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON public.work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_date ON public.work_orders(created_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();