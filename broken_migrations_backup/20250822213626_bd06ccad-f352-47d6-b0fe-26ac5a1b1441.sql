-- Ultra-early baseline migration for work_orders table
-- This ensures work_orders exists before any other migrations that reference it

-- Create work_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  assignee_id UUID,
  assignee_name TEXT,
  team_id UUID,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours NUMERIC,
  completed_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for work_orders
DO $$ 
BEGIN
  -- Drop existing policies if they exist to make this idempotent
  DROP POLICY IF EXISTS "Users can view work orders in their organization" ON public.work_orders;
  DROP POLICY IF EXISTS "Users can create work orders in their organization" ON public.work_orders;
  DROP POLICY IF EXISTS "Users can update work orders in their organization" ON public.work_orders;
  DROP POLICY IF EXISTS "Admins can delete work orders" ON public.work_orders;

  -- Create policies
  CREATE POLICY "Users can view work orders in their organization" 
  ON public.work_orders FOR SELECT 
  USING (organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  ));

  CREATE POLICY "Users can create work orders in their organization" 
  ON public.work_orders FOR INSERT 
  WITH CHECK (
    created_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

  CREATE POLICY "Users can update work orders in their organization" 
  ON public.work_orders FOR UPDATE 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

  CREATE POLICY "Admins can delete work orders" 
  ON public.work_orders FOR DELETE 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_id ON public.work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON public.work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON public.work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON public.work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_date ON public.work_orders(created_date);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_work_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_work_orders_updated_at
      BEFORE UPDATE ON public.work_orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;