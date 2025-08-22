DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'work_orders'
  ) THEN
    ALTER TABLE public.work_orders
      ADD COLUMN IF NOT EXISTS is_historical BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS historical_start_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS historical_notes TEXT,
      ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES auth.users(id);

    CREATE INDEX IF NOT EXISTS idx_work_orders_historical
      ON public.work_orders(is_historical, organization_id);

    CREATE POLICY "Admins can create historical work orders"
      ON public.work_orders
      FOR INSERT
      WITH CHECK (
        is_historical = true AND
        is_org_admin(auth.uid(), organization_id) AND
        created_by_admin = auth.uid()
      );

    CREATE POLICY "Admins can update historical work orders"
      ON public.work_orders
      FOR UPDATE
      USING (
        is_historical = true AND
        is_org_admin(auth.uid(), organization_id)
      );
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'preventative_maintenance'
  ) THEN
    ALTER TABLE public.preventative_maintenance
      ADD COLUMN IF NOT EXISTS is_historical BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS historical_completion_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS historical_notes TEXT;

    CREATE INDEX IF NOT EXISTS idx_pm_historical
      ON public.preventative_maintenance(is_historical, organization_id);

    ALTER TABLE IF EXISTS public.work_order_status_history
      ADD COLUMN IF NOT EXISTS is_historical_creation BOOLEAN DEFAULT false;

    CREATE TABLE IF NOT EXISTS pm_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pm_id UUID NOT NULL REFERENCES preventative_maintenance(id) ON DELETE CASCADE,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by UUID NOT NULL REFERENCES auth.users(id),
        changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE POLICY "Admins can create historical PM"
      ON public.preventative_maintenance
      FOR INSERT
      WITH CHECK (
        is_historical = true AND
        is_org_admin(auth.uid(), organization_id)
      );

    CREATE POLICY "Admins can update historical PM"
      ON public.preventative_maintenance
      FOR UPDATE
      USING (
        is_historical = true AND
        is_org_admin(auth.uid(), organization_id)
      );
  END IF;
END$$;

-- Function to create historical work order with PM
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_historical_work_order_with_pm'
  ) OR (
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') AND
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'preventative_maintenance')
  ) THEN
CREATE OR REPLACE FUNCTION create_historical_work_order_with_pm(
    p_organization_id UUID,
    p_equipment_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_priority work_order_priority,
    p_status work_order_status,
    p_historical_start_date TIMESTAMP WITH TIME ZONE,
    p_historical_notes TEXT DEFAULT NULL,
    p_assignee_id UUID DEFAULT NULL,
    p_team_id UUID DEFAULT NULL,
    p_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_completed_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_has_pm BOOLEAN DEFAULT false,
    p_pm_status TEXT DEFAULT 'pending',
    p_pm_completion_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_pm_notes TEXT DEFAULT NULL,
    p_pm_checklist_data JSONB DEFAULT '[]'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    work_order_id UUID;
    pm_id UUID;
    result JSONB;
BEGIN
    -- Check if user is admin
    IF NOT is_org_admin(auth.uid(), p_organization_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Create historical work order
    INSERT INTO work_orders (
        organization_id,
        equipment_id,
        title,
        description,
        priority,
        status,
        assignee_id,
        team_id,
        due_date,
        completed_date,
        is_historical,
        historical_start_date,
        historical_notes,
        created_by_admin,
        created_by,
        created_date
    ) VALUES (
        p_organization_id,
        p_equipment_id,
        p_title,
        p_description,
        p_priority,
        p_status,
        p_assignee_id,
        p_team_id,
        p_due_date,
        p_completed_date,
        true,
        p_historical_start_date,
        p_historical_notes,
        auth.uid(),
        auth.uid(),
        p_historical_start_date
    ) RETURNING id INTO work_order_id;
    
    -- Create PM if requested
    IF p_has_pm THEN
        INSERT INTO preventative_maintenance (
            work_order_id,
            equipment_id,
            organization_id,
            status,
            completed_at,
            completed_by,
            notes,
            checklist_data,
            is_historical,
            historical_completion_date,
            historical_notes,
            created_by
        ) VALUES (
            work_order_id,
            p_equipment_id,
            p_organization_id,
            p_pm_status,
            CASE WHEN p_pm_status = 'completed' THEN COALESCE(p_pm_completion_date, p_completed_date) ELSE NULL END,
            CASE WHEN p_pm_status = 'completed' THEN auth.uid() ELSE NULL END,
            p_pm_notes,
            p_pm_checklist_data,
            true,
            p_pm_completion_date,
            CONCAT('Historical PM - ', p_pm_notes),
            auth.uid()
        ) RETURNING id INTO pm_id;
    END IF;
    
    -- Create status history entry
    INSERT INTO work_order_status_history (
        work_order_id,
        old_status,
        new_status,
        changed_by,
        reason,
        is_historical_creation,
        metadata
    ) VALUES (
        work_order_id,
        NULL,
        p_status,
        auth.uid(),
        'Historical work order created',
        true,
        jsonb_build_object(
            'historical_start_date', p_historical_start_date,
            'has_pm', p_has_pm,
            'pm_id', pm_id
        )
    );
    
    result := jsonb_build_object(
        'success', true,
        'work_order_id', work_order_id,
        'pm_id', pm_id,
        'has_pm', p_has_pm
    );
    
    RETURN result;
END;
$$;
END IF;
END$$;
