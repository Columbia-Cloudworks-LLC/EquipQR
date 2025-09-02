-- Create work order status history table
CREATE TABLE public.work_order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  old_status work_order_status,
  new_status work_order_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create preventative maintenance status history table
CREATE TABLE public.pm_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pm_id uuid NOT NULL REFERENCES preventative_maintenance(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for work order status history
CREATE POLICY "Users can view work order history for their organization"
ON public.work_order_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_status_history.work_order_id
    AND is_org_member(auth.uid(), wo.organization_id)
  )
);

CREATE POLICY "Admins can insert work order history"
ON public.work_order_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_status_history.work_order_id
    AND is_org_admin(auth.uid(), wo.organization_id)
  )
  AND changed_by = auth.uid()
);

-- RLS policies for PM status history
CREATE POLICY "Users can view PM history for their organization"
ON public.pm_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM preventative_maintenance pm
    WHERE pm.id = pm_status_history.pm_id
    AND is_org_member(auth.uid(), pm.organization_id)
  )
);

CREATE POLICY "Admins can insert PM history"
ON public.pm_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM preventative_maintenance pm
    WHERE pm.id = pm_status_history.pm_id
    AND is_org_admin(auth.uid(), pm.organization_id)
  )
  AND changed_by = auth.uid()
);

-- Function to revert work order status
CREATE OR REPLACE FUNCTION public.revert_work_order_status(
  p_work_order_id uuid,
  p_reason text DEFAULT 'Reverted by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_status work_order_status;
  org_id uuid;
  result jsonb;
BEGIN
  -- Get current status and org
  SELECT status, organization_id INTO current_status, org_id
  FROM work_orders
  WHERE id = p_work_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;
  
  -- Check if user is admin
  IF NOT is_org_admin(auth.uid(), org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Only allow reverting from completed or cancelled
  IF current_status NOT IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only revert completed or cancelled work orders');
  END IF;
  
  -- Insert history record
  INSERT INTO work_order_status_history (
    work_order_id, old_status, new_status, changed_by, reason, metadata
  ) VALUES (
    p_work_order_id, current_status, 'accepted', auth.uid(), p_reason,
    jsonb_build_object('reverted_from', current_status, 'reverted_at', now())
  );
  
  -- Update work order status
  UPDATE work_orders 
  SET 
    status = 'accepted',
    completed_date = NULL,
    updated_at = now()
  WHERE id = p_work_order_id;
  
  RETURN jsonb_build_object('success', true, 'old_status', current_status, 'new_status', 'accepted');
END;
$$;

-- Function to revert PM completion
CREATE OR REPLACE FUNCTION public.revert_pm_completion(
  p_pm_id uuid,
  p_reason text DEFAULT 'Reverted by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_status text;
  org_id uuid;
  result jsonb;
BEGIN
  -- Get current status and org
  SELECT status, organization_id INTO current_status, org_id
  FROM preventative_maintenance
  WHERE id = p_pm_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PM record not found');
  END IF;
  
  -- Check if user is admin
  IF NOT is_org_admin(auth.uid(), org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Only allow reverting from completed
  IF current_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only revert completed PM records');
  END IF;
  
  -- Insert history record
  INSERT INTO pm_status_history (
    pm_id, old_status, new_status, changed_by, reason, metadata
  ) VALUES (
    p_pm_id, current_status, 'pending', auth.uid(), p_reason,
    jsonb_build_object('reverted_from', current_status, 'reverted_at', now())
  );
  
  -- Update PM status
  UPDATE preventative_maintenance 
  SET 
    status = 'pending',
    completed_at = NULL,
    completed_by = NULL,
    updated_at = now()
  WHERE id = p_pm_id;
  
  RETURN jsonb_build_object('success', true, 'old_status', current_status, 'new_status', 'pending');
END;
$$;

-- Trigger to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_work_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if status actually changed and it's not a revert operation
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NOT EXISTS (
       SELECT 1 FROM work_order_status_history 
       WHERE work_order_id = NEW.id 
       AND changed_at > now() - interval '1 second'
       AND changed_by = auth.uid()
     ) THEN
    INSERT INTO work_order_status_history (
      work_order_id, old_status, new_status, changed_by, reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), 'Status updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for work order status changes
DROP TRIGGER IF EXISTS work_order_status_change_trigger ON work_orders;
CREATE TRIGGER work_order_status_change_trigger
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_status_change();

-- Similar trigger for PM status changes
CREATE OR REPLACE FUNCTION public.log_pm_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if status actually changed and it's not a revert operation
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NOT EXISTS (
       SELECT 1 FROM pm_status_history 
       WHERE pm_id = NEW.id 
       AND changed_at > now() - interval '1 second'
       AND changed_by = auth.uid()
     ) THEN
    INSERT INTO pm_status_history (
      pm_id, old_status, new_status, changed_by, reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), 'Status updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for PM status changes
DROP TRIGGER IF EXISTS pm_status_change_trigger ON preventative_maintenance;
CREATE TRIGGER pm_status_change_trigger
  AFTER UPDATE ON preventative_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION log_pm_status_change();