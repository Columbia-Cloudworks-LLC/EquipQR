-- Robust idempotent baseline/fix for work_orders
-- 1) Create table if missing (minimal cols), 2) Add missing columns, 3) Policies, 4) Indexes, 5) updated_at trigger

-- Ensure table exists with minimal required columns
DO $$
BEGIN
  IF to_regclass('public.work_orders') IS NULL THEN
    CREATE TABLE public.work_orders (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add commonly used columns if they don't exist (kept nullable to avoid backfill issues)
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS equipment_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS assignee_id UUID,
  ADD COLUMN IF NOT EXISTS assignee_name TEXT,
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS completed_date TIMESTAMPTZ;

-- Optionally align status to enum type if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_order_status') THEN
    -- Only alter if current type is not already the enum
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'work_orders' 
        AND column_name = 'status' 
        AND data_type <> 'USER-DEFINED'
    ) THEN
      ALTER TABLE public.work_orders 
        ALTER COLUMN status TYPE work_order_status 
        USING status::work_order_status;
    END IF;
  END IF;
END $$;

-- Recreate baseline policies only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_orders' 
      AND policyname = 'Users can view work orders in their organization'
  ) THEN
    CREATE POLICY "Users can view work orders in their organization" 
    ON public.work_orders FOR SELECT 
    USING (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_orders' 
      AND policyname = 'Users can create work orders in their organization'
  ) THEN
    CREATE POLICY "Users can create work orders in their organization" 
    ON public.work_orders FOR INSERT 
    WITH CHECK (
      created_by = auth.uid() AND organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_orders' 
      AND policyname = 'Users can update work orders in their organization'
  ) THEN
    CREATE POLICY "Users can update work orders in their organization" 
    ON public.work_orders FOR UPDATE 
    USING (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ))
    WITH CHECK (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_orders' 
      AND policyname = 'Admins can delete work orders'
  ) THEN
    CREATE POLICY "Admins can delete work orders" 
    ON public.work_orders FOR DELETE 
    USING (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    ));
  END IF;
END $$;

-- Indexes (safe if columns now exist)
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_id ON public.work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON public.work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON public.work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON public.work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_date ON public.work_orders(created_date);

-- updated_at helper and trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_work_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_work_orders_updated_at
      BEFORE UPDATE ON public.work_orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
